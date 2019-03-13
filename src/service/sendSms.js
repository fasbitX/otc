const accountSid = '';
const authToken = '';
const client = require('twilio')(accountSid, authToken);

export const sendSms = async (mobileNumber) => {
  console.log('called');
  const otp = Math.floor(1000 + Math.random() * 9000);
  await client.messages
    .create({
      body: otp,
      from: '',
      to: ''
    })
    .then(message => console.log('message', message.sid))
    .done();
  return otp;
}