import StellarSdk from 'stellar-sdk';
import { AES, enc } from 'crypto-js';
import request from 'request';
import fs from 'fs';
import http from 'http';
import { Transform } from 'stream';
import async from 'async';
import lodash from 'lodash';

import { payment } from '../service/stellarAccount'
import { getUserProfile } from './user';
import { getAdmin } from './admin';
import { Transaction } from '../models/TransactionSchema';
import { Deposit } from '../models/DepositSchema';
import { Wallet } from '../models/WalletSchema';
import { saveCardDetails, saveWithdrawDetails } from './card';
import { createAccount, getAccount } from '../service/stellarAccount';

// const stripe = require("stripe")('sk_test_BlD4SrbP60Qa94PrQ1pTHYtB');


const ENVCryptoSecret = 'Stellar-is-awesome';
StellarSdk.Network.useTestNetwork();

let marketRate;

export const fiatBalance = async (req, res) => {
  const admin = await getAdmin();
  const stripe = require("stripe")(admin.stripeKey);
  stripe.balance.retrieve(function (error, balance) {
    if (error) res.status(500).send('OOPS!! Something went wrong');
    res.status(200).send(balance)
  });
}

export const stellarBalance = async (req, res) => {
  const response = await getAdmin();

  const result = await getAccount(response.stellarAddress);
  res.status(200).send(result.balances);
}

export const userStellarBalance = async (req, res) => {
  const user = await getUserProfile(req.body.user);

  const result = await getAccount(user.stellarAddress);
  res.status(200).send(result.balances);
}

export const nativeAssetTransaction = async (req, res) => {

  // const sender = await getUserProfile(req.body.sender);
  const receiver = await getUserProfile(req.body.receiver);
  const admin = await getAdmin();


  console.log('Admin', admin);
  console.log("-------------");
  console.log('Receiver', receiver);
  const signerKeys = StellarSdk.Keypair.fromSecret(
    // AES.decrypt(
    admin.stellarSeed,
    // ENVCryptoSecret
    // ).toString(enc.Utf8)
  )
  console.log('admin', admin);

  try {
    const amount = req.body.amount

    const { hash } = await payment(
      signerKeys,
      receiver.stellarAddress,
      req.body.amount.toString()
    )
    console.log('sent successfully', hash);

    // const transactionFee = await payment(
    //   signerKeys,
    //   admin.stellarAddress,
    //   req.body.fee.toString()
    // )
    // console.log('admin sent successfully', transactionFee.hash);
    // txtype : 1-> buy, 2-> sell
    const dbUpdate = Object.assign({}, { 'sender': admin._id, 'receiver': receiver._id, 'amount': req.body.amount, 'currency': 'xlm', 'fee': req.body.fee, 'hash': hash, 'walletAmount': req.body.actual_usd, 'walletFee': 0, 'txtype': 1, 'cardNumber': req.body.card.number });
    let result = await saveTransaction(dbUpdate, res);

    const data_db_update = Object.assign({}, { 'user_id': receiver._id, 'coin_name': req.body.coin_name, 'balance': req.body.amount });
    console.log(data_db_update);

    Wallet.findOne({ user_id: receiver._id, coin_name: req.body.coin_name }, (error, existing) => {
      console.log('existing', existing);
      if (error) console.error(error);
      if (existing == null) {
        const savewallet = saveWallet(data_db_update);
      } else {

        let amount = parseFloat(existing.balance) + parseFloat(req.body.amount);
        const data_db_update = Object.assign({}, { 'balance': amount });
        let updatewallet = updateWallet(existing._id, data_db_update, res);
      }
    })


if(req.body.is_wallet_balance==true){
  console.log("update Fiat wallet balance.");
    Wallet.findOne({ user_id: receiver._id, coin_name: 'usd' }, (error, existing) => {
      console.log('existing', existing);
      if (error) console.error(error);
      if (existing == null) {
      } else {
        let amount = parseFloat(existing.balance) - parseFloat(req.body.actual_usd);
        const data_db_update = Object.assign({}, { 'balance': amount });
        console.log("Updated Fiat Wallet Balance ",data_db_update);
        let updatewallet = updateWallet(existing._id, data_db_update, res);
      }
    })
  }



    if (result !== '') res.status(200).send({ "status": true, result });
  } catch (error) {
    console.log(error);
    res.status(200).send({ "status": false, 'message': 'OOPS!! Something went wrong' })
  }
}

export const sent_user_to_admin = async (req, res) => {
  console.log("-------------");
  console.log('Request data ', req.body);
  console.log("-------------");
  // const sender = await getUserProfile(req.body.sender);
  const sender = await getUserProfile(req.body.sender);
  const admin = await getAdmin();

  console.log('Admin', admin);
  console.log("-------------");
  console.log('sender', sender);
  const signerKeys = StellarSdk.Keypair.fromSecret(
    AES.decrypt(
      sender.stellarSeed,
      ENVCryptoSecret
    ).toString(enc.Utf8)
  )

  try {
    const amount = req.body.sellamount

    const { hash } = await payment(
      signerKeys,
      admin.stellarAddress,
      req.body.sellamount.toString()
    )
    console.log('sent successfully', hash);

    // txtype : 1-> buy, 2-> sell
    const dbUpdate = Object.assign({}, { 'sender': sender._id, 'receiver': admin._id, 'amount': req.body.amount, 'currency': 'xlm', 'fee': req.body.fee, 'hash': hash, 'walletAmount': req.body.actual_usd, 'walletFee': 0, 'txtype': 2 });
    let result = await saveTransaction(dbUpdate, res);

    const data_db_update = Object.assign({}, { 'user_id': sender._id, 'coin_name': req.body.coin_name, 'balance': req.body.amount });
    console.log(data_db_update);


    Wallet.findOne({ user_id: sender._id, coin_name: req.body.coin_name }, (error, existing) => {
      console.log('existing', existing);
      if (error) console.error(error);
      if (existing == null) {

        const savewallet = saveWallet(data_db_update);
      } else {

        let amount = parseFloat(existing.balance) - parseFloat(req.body.amount);
        console.log('updated_amount', amount);
        const data_db_update = Object.assign({}, { 'coin_name': req.body.coin_name, 'balance': amount });
        let updatewallet = updateWallet(existing._id, data_db_update, res);
      }
    })
    if (result !== '') {
      fileUpload( req, res);
    }
  } catch (error) {
    res.status(500).send('OOPS!! Something went wrong');
  }

  //   if (result !== '') res.status(200).send({ "status": true, result });
  // } catch (error) {
  //   console.log(error);
  //   res.status(200).send({ "status": false, 'message': 'OOPS!! Something went wrong' })
  // }
}

export const user_to_user = async (req, res) => {

  // const sender = await getUserProfile(req.body.sender);
  const sender = await getUserProfile(req.body.sender);
  const admin = await getAdmin();

  console.log('Req of Body', req.body);
  console.log("-------------");
  console.log('sender', sender);
  const signerKeys = StellarSdk.Keypair.fromSecret(
    AES.decrypt(
      sender.stellarSeed,
      ENVCryptoSecret
    ).toString(enc.Utf8)
  )

  try {
    const amount = req.body.amount

    const { hash } = await payment(
      signerKeys,
      req.body.toAddress,
      req.body.amount.toString()
    )
    console.log('sent successfully', hash);

    // txtype : 1-> buy, 2-> sell
    const dbUpdate = Object.assign({}, { 'sender': sender._id, 'outerTransfer': '1', 'amount': req.body.amount, 'currency': 'xlm', 'fee': req.body.fee, 'hash': hash, 'walletAmount': req.body.actual_usd, 'walletFee': 0, 'txtype': 3, 'toAddrress': req.body.toAddress });
    let result = await saveTransaction(dbUpdate, res);

    const data_db_update = Object.assign({}, { 'user_id': sender._id, 'coin_name': req.body.coin_name, 'balance': req.body.amount });
    console.log(data_db_update);


    Wallet.findOne({ user_id: sender._id, coin_name: req.body.coin_name }, (error, existing) => {
      console.log('existing', existing);
      if (error) console.error(error);
      if (existing == null) {

        const savewallet = saveWallet(data_db_update);
      } else {

        let amount = parseFloat(existing.balance) - parseFloat(req.body.amount);
        console.log('updated_amount', amount);
        const data_db_update = Object.assign({}, { 'coin_name': req.body.coin_name, 'balance': amount });
        let updatewallet = updateWallet(existing._id, data_db_update, res);
      }
    })

    if (result !== '') res.status(200).send({ "status": true, result });
  } catch (error) {
    console.log(error);
    res.status(200).send({ "status": false, 'message': 'OOPS!! Something went wrong' })
  }
}

export const saveTransaction = (data) => {
  let transaction = new Transaction(data);
  return transaction.save();
}
export const saveWallet = (data) => {
  let wallet = new Wallet(data);
  return wallet.save();
}

export const updateWallet = (id, data, res) => {

  console.log('id', id);
  Wallet.findOneAndUpdate(
    { _id: id },
    { $set: data },
    { new: true },
    (error, response) => {
      if (error) console.error(error);
      else {
        return true;
        // res.status(200).send({"status":true,response});
      }
    }
  )

}



export const sentStellarTransaction = async (req, res) => {
  const admin = await getAdmin();
  Transaction.find({ $and: [{ currency: 'xlm', sender: admin._id }] })
    .sort({ createdTs: -1 })
    .populate({ path: 'receiver', select: 'stellarAddress' })
    .exec((error, response) => {
      if (error) res.status(500).send('OOPS!! Something went wrong');
      else {
        res.status(200).send(response);
      }
    });
}

export const receivedStellarTransaction = async (req, res) => {
  const admin = await getAdmin();
  Transaction.find({ $and: [{ currency: 'xlm', receiver: admin._id }] })
    .sort({ createdTs: -1 })
    .populate({ path: 'sender', select: 'stellarAddress' })
    .exec((error, response) => {
      if (error) res.status(500).send('OOPS!! Something went wrong');
      else {
        res.status(200).send(response);
      }
    });
}

export const withdrawTransaction = async (req, res) => {
  const admin = await getAdmin();
  Transaction.find({ $and: [{ currency: 'usd', sender: admin._id }] })
    .sort({ createdTs: -1 })
    .exec((error, response) => {
      if (error) res.status(500).send('OOPS!! Something went wrong');
      else {
        res.status(200).send(response);
      }
    });
}

export const depositTransaction = async (req, res) => {
  const admin = await getAdmin();
  Transaction.find({ $and: [{ currency: 'usd', receiver: admin._id }] })
    .sort({ createdTs: -1 })
    .exec((error, response) => {
      if (error) res.status(500).send('OOPS!! Something went wrong');
      else {
        res.status(200).send(response);
      }
    });
}

export const getReceivedAmount = (transactionId) => {
  console.log('called', transactionId);
  return Transaction.findOne({ transactionID: transactionId }, (error, response) => {
    console.log('response', response);
    if (error) console.error({ 'message': error })
    else {
      return (response);
    }
  })
}

export const depositFeeTransaction = async (req, res) => {
  const admin = await getAdmin();
  Transaction.find({ $and: [{ currency: 'usd', receiver: admin._id }] })
    .sort({ createdTs: -1 })
    .lean()
    .exec(async (error, response) => {
      if (error) console.error(error);
      else {
        const final = [];
        async.eachLimit(response, 1, async (usdTransaction, callback) => {
          const xlmTransaction = await getReceivedAmount(usdTransaction._id);
          if (xlmTransaction !== null) final.push(Object.assign({}, usdTransaction, { fee: xlmTransaction.fee, received: xlmTransaction.amount }));
          callback();
        }, () => {
          res.status(200).send(final);
        });
      }
    });
}

export const withdrawFeeTransaction = async (req, res) => {
  const admin = await getAdmin();
  Transaction.find({ $and: [{ currency: 'xlm', receiver: admin._id }] })
    .sort({ createdTs: -1 })
    .lean()
    .exec(async (error, response) => {
      if (error) console.error(error);
      else {
        const final = [];
        async.eachLimit(response, 1, async (xlmTransaction, callback) => {
          const usdTransaction = await getReceivedAmount(xlmTransaction._id);
          if (usdTransaction !== null) final.push(Object.assign({}, xlmTransaction, { fee: usdTransaction.fee, received: usdTransaction.amount }));
          callback();
        }, () => {
          res.status(200).send(final);
        });
      }
    });
}

export const userTransaction = async (req, res) => {
  const admin = await getAdmin();
  Transaction.find({ $and: [{ currency: 'xlm', receiver: { $ne: admin._id }, sender: { $ne: admin._id } }] })
    .sort({ createdTs: -1 })
    .populate({ path: 'receiver', select: ['stellarAddress', '_id'] })
    .exec((error, response) => {
      if (error) res.status(500).send('OOPS!! Something went wrong');
      else {
        res.status(200).send(response);
      }
    });
}

const checkStellarAmount = async (admin, req, res, next) => {
  const response = await getAdmin();
  const result = await getAccount(response.stellarAddress);
  res.status(200).send(result.balances);
}

export const stripeTransaction = async (req, res) => {

  await getCurrentStellarRate();
  const admin = await getAdmin();
  if (req.body.saveCard === true) {
    const card = await saveCardDetails(req.body.card);
  }
if(req.body.is_wallet_balance==false){
  const stripe = require("stripe")(admin.stripeKey);

  stripe.customers.create({
    description: 'Customer for stripe transaction',
    source: req.body.stripeToken
  }, (error, customer) => {
    console.log('customer', customer);
    if (error) res.status(500).send('OOPS!! Something went wrong');
    stripe.charges.create({
      amount: (req.body.actual_usd * 100).toString(),
      currency: "usd",
      customer: customer.id,
      description: "Charge for each transaction"
    }, async (error, charge) => {
      console.log("****************************");
      console.log("charge ", charge);
      console.log("error", error);
      console.log("****************************");
      if (error) res.status(200).send({ status: false, message: 'OOPS!! Something went wrong' });
      if (charge.status === 'succeeded') {
        // const dbUpdate = Object.assign({}, {'sender': req.body.user, 'receiver': admin._id, 'amount': req.body.amount, 'currency': 'usd', 'cardNumber': req.body.card.number });
        // const usdTransaction = await saveTransaction(dbUpdate);

        await nativeAssetTransaction(req, res);
      }
    });
  });
}else{

  await nativeAssetTransaction(req, res);
}
}


export const depositStripeTransaction = async (req, res) => {

  const admin = await getAdmin();
  if (req.body.saveCard === true) {
    const card = await saveCardDetails(req.body.card);
  }

  const stripe = require("stripe")(admin.stripeKey);

  stripe.customers.create({
    description: 'Customer for stripe transaction',
    source: req.body.stripeToken
  }, (error, customer) => {
    console.log('customer', customer);
    if (error) res.status(500).send('OOPS!! Something went wrong');
    stripe.charges.create({
      amount: (req.body.amount * 100).toString(),
      currency: "usd",
      customer: customer.id,
      description: "Charge for each transaction"
    }, async (error, charge) => {
      console.log('charge', charge);
      if (error) res.status(200).send({ status: false, message: 'OOPS!! Something went wrong' });
      if (charge.status === 'succeeded') {
        const dbUpdate = Object.assign({}, { 'user': req.body.user, 'amount': req.body.totalUsd, 'transactionID': charge.id, 'currency': req.body.currency, 'cardNumber': req.body.card.number, 'fee': req.body.fee,'type':1 });
        const usdTransaction = await saveDepositTransaction(dbUpdate);
        if (usdTransaction !== '') {

        const data_db_update = Object.assign({}, { 'user_id': req.body.user, 'coin_name': req.body.currency, 'balance': req.body.totalUsd });
        console.log(data_db_update); 
          Wallet.findOne({ user_id: req.body.user, coin_name: req.body.currency }, (error, existing) => {
            console.log('existing', existing);
            if (error) console.error(error);
            if (existing == null) {
              const savewallet = saveWallet(data_db_update);
            } else {
              let amount = parseFloat(existing.balance) +  parseFloat(req.body.totalUsd);
              console.log('updated_amount', amount);
              const data_db_update = Object.assign({}, { 'coin_name': 'usd', 'balance': amount });
              let updatewallet = updateWallet(existing._id, data_db_update, res);
            }
          })

        res.status(200).send({ "status": true, usdTransaction });
      }

      }
    });
  });
}




export const saveDeposit = (data) => {
  let deposit = new Deposit(data);
  return deposit.save();
}
export const saveDepositTransaction = (data) => {
  let deposit = new Deposit(data);
  return deposit.save();
}


export const stellarPayment = async (admin, usdTransaction, req, res) => {
  const receiver = await getUserProfile(req.body.user);
  const adminKeys = StellarSdk.Keypair.fromSecret(
    // AES.decrypt(
    admin.stellarSeed,
    //   ENVCryptoSecret
    // ).toString(enc.Utf8)
  )

  try {
    const { hash } = await payment(
      adminKeys,
      receiver.stellarAddress,
      req.body.xlmAmount.toString()
    )
    console.log('sent successfully', hash);

    const dbUpdate = Object.assign({}, { 'sender': admin._id, 'receiver': receiver._id, 'amount': req.body.xlmAmount, 'currency': 'xlm', 'transactionID': usdTransaction._id, 'hash': hash });
    let result = await saveTransaction(dbUpdate, res);

    if (result !== '') res.status(200).send(result);
  } catch (error) {
    res.status(500).send('OOPS!! Something went wrong');
  }
}

export const getCurrentStellarRate = async () => {
  request('https://min-api.cryptocompare.com/data/price?fsym=USD&tsyms=XLM', (error, result) => {
    if (error) console.error(error);
    else {
      console.log('res', JSON.parse(result.body).XLM);
      marketRate = JSON.parse(result.body).XLM
    }
  })
}

const checkFiatAmount = async (admin, req, res, next) => {
  const stripe = require("stripe")(admin.stripeKey);
  stripe.balance.retrieve(function (error, balance) {
    if (error) res.status(500).send('OOPS!! Something went wrong');
    if (balance < req.body.usd * 100) res.status(500).send('Please try smaller amount');
    else next();
  });
}

export const withdraw = async (req, res) => {
  const admin = await getAdmin();
  const user = await getUserProfile(req.params.id);

  // const signerKeys = StellarSdk.Keypair.fromSecret(
  //   AES.decrypt(
  //     user.stellarSeed,
  //     ENVCryptoSecret
  //   ).toString(enc.Utf8)
  // )

  // try {
  //   const { hash } = await payment(
  //     signerKeys,
  //     admin.stellarAddress,
  //     req.body.xlm.toString()
  //   )
  //   console.log('sent successfully', hash);

  //   const sendUpdate = Object.assign({}, { 'sender': user._id, 'receiver': admin._id, 'amount': req.body.xlm, 'currency': 'xlm', fee: Number(req.body.fee) + Number(req.body.rate), 'hash': hash });
  //   const xlmTransaction = await saveTransaction(sendUpdate);

  //   if (xlmTransaction !== '') {
      fileUpload( req, res);
  //   }
  // } catch (error) {
  //   res.status(500).send('OOPS!! Something went wrong');
  // }
}

const downloadFile = async (url, extension, req) => {
  return new Promise((resolve, reject) => {
    http.request(url, function (response) {
      var data = new Transform();

      response.on('data', function (chunk) {
        // console.log('chunk created');
        data.push(chunk);
      });

      response.on('end', async function () {
        const currentDate = Date.now();
        // console.log("currentDate",currentDate);
        await fs.writeFileSync(`images/${req.params.id}.${extension}`, data.read());
        resolve();
      })
    }).end(console.log('end'));
  })
}

const fileUpload = async (req, res) => {

  const url = req.body.verificationFile;
  // console.log("url",url);
  const extensionArray = url.split('.');
  const extension = extensionArray[extensionArray.length - 1];

  // console.log("extension",extension);
  const upload =await downloadFile(url, extension, req);
  const admin = await getAdmin();
  const stripe = require("stripe")(admin.stripeKey);
  console.log('Download  created',upload);
  stripe.fileUploads.create(
    {
      purpose: 'identity_document',
      file: {
        data: fs.readFileSync(`images/${req.params.id}.${extension}`),
        name: 'licence.jpg',
        type: 'application/octet-stream'
      }
    }, (error, file) => {
      // console.log("error",error);
      // console.log("file",file);
      if (error) res.status(500).send('OOPS!! Something went wrong');
      createStripeAccount(file, req, res);
    })
}


const createStripeAccount = async (file, req, res) => {

  const admin = await getAdmin();
  const stripe = require("stripe")(admin.stripeKey);
  console.log("------Create Account-------");
  stripe.accounts.create({
    country: "US",
    type: "custom",
    legal_entity: {
      first_name: req.body.firstName,
      last_name: req.body.lastName,
      ssn_last_4: req.body.ssn,
      dob: {
        day: req.body.day,
        month: req.body.month,
        year: req.body.year
      },
      address: {
        city: req.body.city,
        line1: req.body.line1,
        line2: req.body.line2,
        postal_code: req.body.postalCode,
        state: req.body.state
      },
      verification: {
        document: file.id
      },
      type: 'individual',
      phone_number: req.body.phoneNumber
    }
  }, (error, account) => {
    if (error) res.status(500).send('OOPS!! Something went wrong');
    console.log("------Create Account END-------");
    createBankToken(account.id, req, res);
  });
}

const createBankToken = async (accountId, req, res) => {
  console.log("------Create createBankToken-------");
  const admin = await getAdmin();
  const stripe = require("stripe")(admin.stripeKey);

  stripe.tokens.create({
    bank_account: {
      country: 'US',
      currency: 'usd',
      account_holder_name: req.body.accountHolder,
      account_holder_type: 'individual',
      routing_number: req.body.routingNumber,
      account_number: req.body.accountNumber
    }
  }, (error, token) => {
    if (error) res.status(500).send('OOPS!! Something went wrong');
    console.log("------Create createBankToken END-------");
    createBankAccount( accountId, token.id, req, res)
  });
}

const createBankAccount = async (accountId, tokenId, req, res) => {
  console.log("------Create createBankAccount -------");
  const admin = await getAdmin();
  const stripe = require("stripe")(admin.stripeKey);

  stripe.accounts.createExternalAccount(
    accountId,
    { external_account: tokenId },
    (error, bank_account) => {
      if (error) res.status(500).send('OOPS!! Something went wrong');
      console.log("------Create createBankAccount End-------"); 
      createTransfers( accountId, req, res);
    }
  );
}

const createTransfers = async (accountId, req, res) => {

  console.log("------Create createTransfers-------");
// console.log("Entering to Transfer",req.body);
  const admin = await getAdmin();
  const stripe = require("stripe")(admin.stripeKey);

  stripe.transfers.create({
    amount: Math.round(Number(req.body.withdraw_amount) * 100),
    currency: "usd",
    destination: accountId
  }, async (error, transfer) => {
    
    if (error) {console.log("error",error);
    return res.status(200).send('OOPS!! Something went wrong');
  }
    if (req.body.saveDetails === true) {
      await saveWithdrawDetails(lodash.pick(req.body, ['ssn', 'firstName', 'lastName', 'day', 'month', 'year', 'city', 'line1', 'line2', 'state', 'postalCode', 'phoneNumber',
        'verificationFile', 'accountNumber', 'accountHolder', 'routingNumber', 'user']));
    }
    console.log("------Create is_sell-------",req.body.is_sell);
      if(req.body.is_sell==false){
        const dbUpdate = Object.assign({}, { 'user': req.body.user, 'amount': req.body.totalUsd, 'transactionID': transfer.id, 'currency': req.body.currency, 'cardNumber': 12345, 'fee': req.body.fee ,'type':2});
        const usdTransaction = await saveDepositTransaction(dbUpdate);
        if (usdTransaction !== '') {

       
        const data_db_update = Object.assign({}, { 'user_id': req.body.user, 'coin_name': req.body.currency, 'balance': req.body.totalUsd });
        console.log(data_db_update); 
          Wallet.findOne({ user_id: req.body.user, coin_name: req.body.currency }, (error, existing) => {
            console.log('existing', existing);
            if (error) console.error(error);
            if (existing == null) {
              const savewallet = saveWallet(data_db_update);
            } else {
              let amount = parseFloat(existing.balance) -  parseFloat(req.body.totalUsd);
              console.log('updated_amount', amount);
              const data_db_update = Object.assign({}, { 'coin_name': 'usd', 'balance': amount });
              let updatewallet = updateWallet(existing._id, data_db_update, res);
            }
          })
      }else{
        console.log("------Completed- Comming to else------");
        res.status(200).send({ "status": false, usdTransaction });
      }
    }
    console.log("------Completed-------");
    console.log("------Completed-------",transfer);
    return res.status(200).send({ status: true });

    // res.status(200).send(usdUpdate);
  });
}

export const userWalletDetails = async (req, res) => {
  Wallet.find({ user_id: req.params.id,coin_name: {'$ne':'usd' }}, (error, response) => {
    if (error) console.error(error);
    else {
      res.send(response);
    }
  })
}


export const usergetFiatWallet = async (req, res) => {
  Wallet.find({ user_id: req.params.id,coin_name:'usd' }, (error, response) => {
    if (error) console.error(error);
    else {
      res.send(response);
    }
  })
}

export const singleWalletDetails = (req, res) => {
  return Wallet.findOne({ _id: req.params.id }, (error, response) => {
    if (error) console.error(error);
    else {
      res.status(200).send(response);
    }
  })
}
export const getDepositTransactions = (req, res) => {
   Deposit.find({ user: req.params.id }, (error, response) => {
    if (error) console.error(error);
    else {
      res.status(200).send(response);
    }
  })
}

export const getWalletBalanceByCoinName = async (req, res) => {
  // console.log("req in getWalletBalanceByCoinName ",req.body);
  Wallet.findOne({ user_id: req.body.user,coin_name:req.body.coin_name}, (error, response) => {
    if (error) console.error(error);
    else {
      res.send(response);
    }
  })
}
export const getAllTransactions = (req, res) => {
  Transaction.find()
    .exec((error, response) => {
      if (error) console.error(error)
      else {
        res.status(200).send(response);
      }
    })
}
export const getAllDepositTransactions = (req, res) => {
  Deposit.find()
    .exec((error, response) => {
      if (error) console.error(error)
      else {
        res.status(200).send(response);
      }
    })
}
export const getuserTransaction = (req, res) => {
  console.log(req.params.id);
  Transaction.find({ $or: [{ "sender": req.params.id }, { "receiver": req.params.id }] })
    .sort({ createdTs: -1 })
    .exec((error, response) => {
      if (error) console.error(error)
      else {
        console.log(response);
        res.status(200).send(response);
      }
    })
}

