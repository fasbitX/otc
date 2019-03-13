import cloudinary from 'cloudinary';

import { User } from '../models/UserSchema'; 
import { Proof } from '../models/ProofSchema'; 
import { sendSms } from '../service/sendSms';
import { encrypt,decrypt } from '../service/encrypt';
import { createAccount, getAccount } from '../service/stellarAccount';
import { Transaction } from '../models/TransactionSchema'; 
import request from 'request';
import lodash from 'lodash';
import { getAdmin } from './admin';
import async from 'async';

export const saveUser = (req, res) => {
    User.findOne({email: req.body.email}, (error, existingUser) => {
        if(error) console.error(error);
        if(existingUser == null) {
            createUser(req, res);
        }else{
            res.status(200).send({message: 'Existing user',status:true});
        } 
    })
}

export const checkUser = (req, res) => {
    User.findOne({email: req.body.email}, (error, existingUser) => {
        if(error) console.error(error);
        if(existingUser == null) {
            res.status(200).send({status:false});
        }else{
            res.status(200).send({status:true});
        } 
    })
}

export const createUser = async(req, res) => {
    const user = new User(req.body);
    user.password = await encrypt(user.password);
    user.save(async (error, response) => {
        if(error) console.error(error); 
        else {
           
            const result = await createAccount();
            // // const otp = await sendSms(req.body.mobile_number);
            // console.log('otp', otp);
            // otp=1234;
            updateUser(response._id, Object.assign({}, result), res);
        }
    })
}

export const updateUser = (id, body, res) => {

    User.findOneAndUpdate(
        {_id: id}, 
        {$set: body}, 
        {new: true}, 
        (error, response) => {
            if(error) console.error(error);
            else {
                res.status(200).send({response,message: 'User Created Succesfuly',status:true});
            }
        }
    )
}

export const editProfile = (req, res) => {
    updateUser(req.params.id, req.body, res)
}

export const loginUser = (req, res) => {

    User.findOne(
        {email: req.body.email}, 
        (error, user) => {
             console.log("user",user);
            if(error)  res.status(200).send({status:false,'message': error});
            else {
                console.log(user)
               if(user == null)  res.status(200).send({status:false,'message': 'Invalid credential'});
                else {
                    let decryptPassword = decrypt(user.password);
                    if(decryptPassword != req.body.password) res.status(200).send({message: "Incorrect password"});
                    else res.status(200).send({user, message: 'Existing user',status:true});
                }
            }
        }
    )
}

export const uploadImage = (req, res) => {
    cloudinary.v2.uploader.upload(`data:image/jpg;base64,${req.body.image}`, (error, result) => {
        console.log('err', error, result);
        res.send(result);
    });
}

export const searchAutocomplete = (req, res) => {
    const regex = new RegExp(`^${req.query.mobile_number}`);
    User.find({mobile_number: regex}, (error, response) => {
        if(error) console.error(error);
        else {
            res.status(200).send(response);
        }
    })
}

export const getUser = async (req, res) => {
    User.findOne({_id: req.params.id})
        .populate('proofs')
        .exec((error, response) => {
            if(error) console.error({'message': error})
            else {
                res.status(200).send(response);
            }
        })  
}

export const getUserDetails = async (req, res) => {
    User.findOne({mobile_number: req.query.mobile_number})
        .exec((error, response) => {
            if(error) console.error({'message': error})
            else {
                res.status(200).send(response);
            }
        })  
}

export const getUserProfile = (id) => {
    return User.findOne({_id: id}, (error, response) => {
        if(error) console.error({'message': error})
        else {
            return(response);
        }
    })
}

export const getCountryCode = (req, res) => {
    const country = [];
    const url = (req.query.name == undefined) ? 'https://restcountries.eu/rest/v2/all' : `https://restcountries.eu/rest/v2/name/${req.query.name}`;

    request(url, (error, result) => {
        if(error) res.status(500).send({'message': error})
        else {
            JSON.parse(result.body).map((item) => country.push(lodash.pick(item, ['name', 'callingCodes', 'flag'])));
            res.status(200).send(country);
        }
    })
}

export const getAllProfile = (req, res) => {
    User.find()
        .populate('proofs')
        .exec((error, response) => {
            if (error) console.error(error)
            else {
                res.status(200).send(response);
            }
        })
}

export const getUserCount = (req, res) => {
    User.countDocuments()
        .exec((error, count) => {
            if (error) console.error(error)
            else {
                res.status(200).send({count: count});
            }
        })
}

export const getStellarAccount = async(req, res) => {
    const user = await getUserProfile(req.params.id);
    
    const result = await getAccount(user.stellarAddress);
    res.status(200).send(result.balances);
}

export const update_proof = (req, res) => {
    Proof.findOne({user: req.params.id}, (error, response) => {
       
        if(error) console.error(error);
        if(response == null) {
            uploadKyc(req, res);
        }else{
            updateUserKyc(req, res);
            // res.status(200).send({message: 'Existing user',status:true});
        } 
    })
}
export const updateUserKyc = (req, res) => {

    Proof.findOneAndUpdate(
        {user: req.params.id}, 
        {$set: req.body}, 
        {new: true}, 
        (error, response) => {
            if(error) console.error(error);
            else {
                res.status(200).send({response,message: 'User Created Succesfuly',status:true});
            }
        }
    )
}


export const uploadKyc = async (req, res) => {
    const proof = new Proof(req.body);
    proof.save(async (error, response) => {
        if(error) console.error(error);
        else {
            updateUser(req.params.id, {'proofs': response._id}, res);
        }
    })
}   

export const sentStellarTransaction = async (req, res) => {
    const admin = await getAdmin();
    Transaction.find({$and: [{currency: 'xlm', sender: req.params.id, receiver: {$ne: admin._id}}]})
    .sort({createdTs: -1})
      .populate({ path: 'receiver', select: ['stellarAddress', 'firstName', 'lastName']})
      .exec((error, response) => {
        if(error) console.error(error);
        else {
            res.status(200).send(response);
        }
    });
}

export const receivedStellarTransaction = async (req, res) => {
    const admin = await getAdmin();
    Transaction.find({$and: [{currency: 'xlm', receiver: req.params.id, sender: {$ne: admin._id}}]})
    .sort({createdTs: -1})
      .populate({ path: 'sender', select: ['stellarAddress', 'firstName', 'lastName', 'mobile_number']})
      .exec((error, response) => {
        if(error) console.error(error);
        else {
            res.status(200).send(response);
        }
    });
}

export const getReceivedAmount = (transactionId) => {
    console.log('called', transactionId);
    return Transaction.findOne({transactionID: transactionId}, (error, response) => {
        console.log('response', response);
        if(error) console.error({'message': error})
        else {
            return(response);
        }
    })
}



export const depositTransaction = async (req, res) => {
    Transaction.find({$and: [{currency: 'usd', sender: req.params.id}]})
        .sort({createdTs: -1})
        .lean()
        .exec(async (error, response) => {
            if(error) console.error(error);
            else {
                const final = [];
                async.eachLimit(response, 1, async (usdTransaction, callback) => {
                    const xlmTransaction = await getReceivedAmount(usdTransaction._id);
                    if(xlmTransaction !== null) final.push(Object.assign({}, usdTransaction, {hash: xlmTransaction.hash, received: xlmTransaction.amount}));
                    callback();
                }, () => {
                    res.status(200).send(final);
                });
            }
        });
}
  
export const withdrawTransaction = async (req, res) => {
    const admin = await getAdmin();
    Transaction.find({$and: [{currency: 'xlm', sender: req.params.id, receiver: admin._id}]})
        .sort({createdTs: -1})
        .lean()
        .exec(async (error, response) => {
            if(error) console.error(error);
            else {
                const final = [];
                async.eachLimit(response, 1, async (xlmTransaction, callback) => {
                    const usdTransaction = await getReceivedAmount(xlmTransaction._id);
                    if(usdTransaction !== null) final.push(Object.assign({}, xlmTransaction, {received: usdTransaction.amount, walletFee: usdTransaction.walletFee}));
                    callback();
                }, () => {
                    res.status(200).send(final);
                })
            }
        });
}

export const getSingleUser = (req, res) => {
    return User.findOne({_id: req.params.id}, (error, response) => {
        if(error) console.error(error);
        else {
            res.status(200).send(response);
        }
    })
}
