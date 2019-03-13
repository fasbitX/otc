import { Card } from '../models/CardSchema';
import { Account } from '../models/AccountSchema';

export const getCardDetails = (req, res) => {
    return Card.find({user: req.params.id}, (error, response) => {
        if(error) console.error(error);
        else {
            res.status(200).send(response);
        }
    })
}

export const saveCardDetails = (cardDetails) => {
    const card = new Card(cardDetails);
    return card.save();
}

export const saveWithdrawDetails = (details) => {
    return new Promise((resolve, reject) => {
        const account = new Account(details);
        resolve(account.save());
    })
}

export const getWithdrawDetails = (req, res) => {
    return Account.find({user: req.params.id}, (error, response) => {
        if(error) console.error(error);
        else {
            res.status(200).send(response);
        }
    })
}