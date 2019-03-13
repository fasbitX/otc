import { Admin } from '../models/AdminSchema'; 
import { createAccount } from '../service/stellarAccount';
import { encrypt,decrypt } from '../service/encrypt';

export const createUser = async(req, res) => {
    const admin = new Admin(req.body);
    admin.password = await encrypt(admin.password);
    admin.save(async (error, response) => {
        if(error) console.error(error);
        else {
            res.send(response);
        }
    })
}

export const loginUser = (req, res) => {

    Admin.findOne(
        {email: req.body.email}, 
        (error, user) => {
             console.log("user",user);
            if(error)  res.status(200).send({status:false,'message': error});
            else {
                console.log(user)
               if(user == null)  res.status(200).send({status:false,'message': 'Invalid credential'});
                else {
                    let decryptPassword = decrypt(user.password);
                    if(decryptPassword != req.body.password) res.status(200).send({status:false,message: "Incorrect password"});
                    else res.status(200).send({user, message: 'Admin logged successfully',status:true});
                }
            }
        }
    )
}

export const updateUser = (id, body, res) => {

    Admin.findOneAndUpdate(
        {_id: id}, 
        {$set: body}, 
        {new: true, upsert: true}, 
        (error, response) => {
            if(error) console.error(error);
            else {
                res.status(200).send(response);
            }
        }
    )
}

export const updateProfile = (req, res) => {
    updateUser(req.params.id, req.body, res)
}   

export const getAdmin = () => {
    return Admin.findOne((error, response) => {
        if(error) console.error(error);
        else {
            return(response);
        } 
    })
}

export const adminDetails = async (req, res) => {
    const response = await getAdmin();
    res.status(200).send(response);
}

export const createStellarAddress = async (req, res) => {
    const admin = await getAdmin();
    const stellarAccount = await createAccount();
    console.log('stellarAccount', stellarAccount);
    updateUser(admin._id, stellarAccount, res);
}



