<span style="display:block;text-align:center">![Augmint](http://www.augmint.cc/android-chrome-192x192.png)
</span>

# Augmint - Stable Digital Tokens - Simulator

[![Build Status](https://travis-ci.org/Augmint/augmint-sim.svg?branch=staging)](https://travis-ci.org/Augmint/augmint-sim)
[![Greenkeeper badge](https://badges.greenkeeper.io/Augmint/augmint-sim.svg)](https://greenkeeper.io/)
[![Discord](https://img.shields.io/discord/407574313810788364.svg)](https://discord.gg/PwDmsnu)
[![license](https://img.shields.io/github/license/Augmint/augmint-sim.svg)](https://github.com/Augmint/augmint-sim/blob/master/LICENSE)

Augmint is a decentralised stable cryptocurrency on Ethereum. Read more about the concept on [www.augmint.cc](https://www.augmint.cc)

This simulation is running on historical ETH/USD prices.

The simulator implements most of [augmint's core](https://github.com/Augmint/augmint-contracts) features in javascript.

There are a number of actors defined in [scenarios/base.js](https://github.com/DecentLabs/augmint-sim/blob/master/src/scenarios/base.js).

When you start the simulation, it will run a number of iterations for each day. In each iteration the actors act according to their settings - including randomness with a fix seed.

The simulation runs as long as there is ETH/USD price available for the given day.

When you pause the simulation you can change some core monetary parameters and change ETH/USD price day. These changes will be reflected in how the system operates and how the actors behave when you continue.

_NB: The simulation's primary goal is to help the contributors and the Monetary Board to understand Augmint's monetary parameters and their impacts. Therefore on purpose it does not simulate a Monetary Board. But it also means that without adjusting the parameters (i.e. acting as a proper Monetary Board) the market conditions / settings can lead to a state where reserves are depleted and/or ACD demand is way off._

## TO RUN:

Use [sim.augmint.cc](https://sim.augmint.cc)

Or for local install:

(yarn install: https://yarnpkg.com/lang/en/docs/install/)

* install: `yarn`
* run: `yarn dev`

## Augmint

### augmint system accounts:

* eth reserve (eth)
* acd reserve (acd)
* collateral holding (eth)
* interest holding pool (acd)
* interest earned pool (acd)
* locked funds (acd)
* acd fees earned pool (acd)
* eth fees earned pool (eth)

### augmint system parameters:

* ACD_PRICE (determined by ETH/USD rate)
* EXCHANGE_FEE (% of exchange amount)
* LOCK_INTEREST_RATE
* ACD_TRANSFER_FEE
* LOAN_PRODUCTS (hash map of LOAN_ID -> (REPAYMENT_PERIOD, COLLATERAL_RATIO, PREMIUM_RATE, DEFAULT_FEE, MIN_LOAN))

### allowed moves/transactions:

* buy (acdAmount) ACD from reserves
* sell (acdAmount) ACD to reserves
* take out loan
* repay loan
* collect defaulted loan
* lock ACD
* unlock ACD
* transfer ACD between users

## Contribution

Augmint is an open and transparent project.

We are seeking for great minds to extend our core team. Contribution in any area is much appreciated: development, testing, UX&UI design, legal, marketing spreading the word etc.

## Get in touch

Drop us an email: hello@augmint.cc  
 or  
say hi on our [Discord server](https://discord.gg/PwDmsnu): [![Discord](https://img.shields.io/discord/407574313810788364.svg)](https://discord.gg/PwDmsnu)

## Authors

### Initial version

* [BYossarian](https://github.com/BYossarian)
* [szerintedmi](https://github.com/szerintedmi)
* [krosza](https://github.com/krosza)

Check the whole team on [augmint.cc](http://www.augmint.cc)

---

![DECENT](http://www.decent.org/images/logo-voronoi_120x33.png)

Augmint was born at [DECENT Labs](http://www.decent.org)

## Licence

This project is licensed under the GNU Affero General Public License v3.0 license - see the [LICENSE](LICENSE) file for details.
