"use strict";
const { ACD0, PT1, Acd, Pt } = require("../lib/augmintNums.js");

const AugmintError = require("../augmint/augmint.error.js");
const Actor = require("./actor.js");
const ONE_DAY_IN_SECS = 24 * 60 * 60;
const defaultParams = {
    REPAY_X_DAYS_BEFORE: 1,
    BUY_ACD_X_DAYS_BEFORE_REPAY: 1,
    WANTS_TO_BORROW_AMOUNT: Acd(10000), // how much they want to borrow
    WANTS_TO_BORROW_AMOUNT_GROWTH_PA: Pt(0.1), // increase in demand % pa.
    CHANCE_TO_TAKE_LOAN: Pt(1), // % chance to take loan on a day (when there is no open loan)
    CHANCE_TO_SELL_ALL_ACD: Pt(1), // % chance to sell all acd on a day (unless repayment is due soon)

    COLLATERAL_RATIO_SENSITIVITY: Pt(1) /* not implemented! */,
    INTEREST_SENSITIVITY: Pt(
        2
    ) /* how sensitive is the borrower for marketLoanInterestRate ?
                            linear, marketChance = augmintInterest / (marketInterest * INTEREST_SENSITIVITY)  */
    // TODO: add loan forgotten chance param ( 0.1%?)
};

class BorrowerBasic extends Actor {
    constructor(id, balances, state, _params = {}) {
        super(id, balances, state, Object.assign({}, defaultParams, _params));
        this.triedToBuyForRepayment = false;
    }

    executeMoves(state) {
        const { currentTime } = state.meta;
        const loanProduct = state.augmint.loanProducts[0];
        let willRepaySoon = false;
        let timeUntilRepayment = 0;
        let repaymentDueWithCost = ACD0;
        let repaymentDue = ACD0;
        let collateralValueAcd = ACD0;
        let wantToTake = false;
        let wantToTakeAmount = ACD0;
        let canTakeAmount = ACD0;

        if (this.loans.length !== 0) {
            /* we have a loan, is repayment due? */
            repaymentDue = this.loans[0].repaymentDue;
            repaymentDueWithCost = this.loans[0].repaymentDueWithCost;
            timeUntilRepayment = this.loans[0].repayBy - currentTime;
            collateralValueAcd = this.convertEthToAcd(this.loans[0].collateralInEth);
            willRepaySoon =
                currentTime >=
                    this.loans[0].repayBy -
                        (this.params.BUY_ACD_X_DAYS_BEFORE_REPAY + this.params.REPAY_X_DAYS_BEFORE) * ONE_DAY_IN_SECS &&
                repaymentDueWithCost.lt(collateralValueAcd); // TODO: move this last bit to loanManager? Unlikely that anyone would repay a loan if collateral value below repayment amount
        } else {
            /* no open loans , can we and do we want we take a new loan? */
            const augmintInterest = loanProduct.interestPt;
            const marketInterest = state.augmint.params.marketLoanInterestRate;
            const marketChance = Math.min(1, marketInterest / (augmintInterest * this.params.INTEREST_SENSITIVITY));
            wantToTake = state.utils.byChanceInADay(this.params.CHANCE_TO_TAKE_LOAN * marketChance);
            wantToTakeAmount = wantToTake
                ? Acd(this.params.WANTS_TO_BORROW_AMOUNT.mul(loanProduct.loanCollateralRatio))
                : ACD0;

            if (wantToTakeAmount.gt(ACD0)) {
                canTakeAmount = Acd(
                    Math.min(
                        this.convertEthToAcd(this.ethBalance).mul(loanProduct.loanCollateralRatio),
                        state.augmint.maxBorrowableAmount(0),
                        wantToTakeAmount,
                        wantToTakeAmount.lt(loanProduct.minimumLoanInAcd) ? ACD0 : wantToTakeAmount
                    )
                );
                //         console.debug(
                //             `**** Want TO TAKE LOAN. canTakeAmount: ${canTakeAmount} wantToTakeAmount: ${wantToTakeAmount}
                // maxBorrowableAmount: ${state.augmint.maxBorrowableAmount(0)} min loan amount: ${loanProduct.minimumLoanInAcd}`
                //         );
            }
        }

        /* Get new loan  */
        if (canTakeAmount.gt(ACD0)) {
            // console.debug(
            //     `**** GOING TO TAKE LOAN. amount: ${canTakeAmount} maxBorrowableAmount: ${state.augmint.maxBorrowableAmount(
            //         0
            //     )}`
            // );
            this.triedToBuyForRepayment = false;

            if (wantToTake) {
                this.takeLoan(0, canTakeAmount);
            }
        }

        /* Sell all ACD (CHANCE_TO_SELL_ALL_ACD) unless repayment is due soon */
        if (
            this.acdBalance.gt(ACD0) &&
            !willRepaySoon &&
            state.utils.byChanceInADay(this.params.CHANCE_TO_SELL_ALL_ACD)
        ) {
            this.sellACD(this.acdBalance);
        }

        if (willRepaySoon) {
            /* BUY ACD in advance for repayment */
            if (
                this.acdBalance.lt(repaymentDue) &&
                !this.triedToBuyForRepayment &&
                timeUntilRepayment >= state.meta.timeStep
            ) {
                // buys ACD for repayment
                const repaymentAmountMissing = repaymentDue.sub(this.acdBalance);
                const buyAmount = repaymentAmountMissing
                    .div(PT1.sub(state.augmint.params.exchangeFeePercentage))
                    .add(0.1); // adding 0.1 to deal with multiple matchorders resulting in higher total exchange fee b/c of rounding

                this.buyACD(buyAmount);
                this.triedToBuyForRepayment = true;
            }

            /* Couldn't buy ACD on time or rare edge case when ethValue recovered since last tick but
                there would not be enough time to buy acd. We let it default, not even trying to buy ACD : */
            if (this.acdBalance.lt(repaymentDue) && timeUntilRepayment < state.meta.timeStep) {
                console.debug(
                    `${this.id} didn't have enough balance to repay on time. Loan will default.
    currentDay: ${state.meta.currentDay} timeStep: ${state.meta.timeStep}
    Likely collateral value recovered too late to buy ACD or couldn't buy ACD on time.
    repaymentDue: ${repaymentDue} ACD borrower balance: ${this.acdBalance}
    collateralValueAcd: ${collateralValueAcd}
    triedToBuyForRepayment: ${this.triedToBuyForRepayment ? "true" : "false"}`
                );
            }

            /* Repay REPAY_X_DAYS_BEFORE maturity  */
            if (
                repaymentDueWithCost.lt(collateralValueAcd) &&
                timeUntilRepayment <= this.params.REPAY_X_DAYS_BEFORE * ONE_DAY_IN_SECS &&
                this.acdBalance.gte(repaymentDue)
            ) {
                // repays ACD:
                if (!this.repayLoan(this.loans[0].id)) {
                    throw new AugmintError(
                        `${this.id} couldn't repay, loanManager.repayLoan() returned false.
                            repaymentDue: ${repaymentDue} ACD borrower balance: ${this.acdBalance}
                            collateralValueAcd: ${collateralValueAcd}`
                    );
                }
            }
        }

        /* Increase loan  demand */
        if (state.meta.iteration % state.params.stepsPerDay === 0) {
            this.params.WANTS_TO_BORROW_AMOUNT = this.params.WANTS_TO_BORROW_AMOUNT.mul(
                this.params.WANTS_TO_BORROW_AMOUNT_GROWTH_PA.add(1) ** (1 / 365)
            );
        }
        super.executeMoves(state);
    }
}

module.exports = BorrowerBasic;
