import transporter from './mailer.js';

const mailOptions = {
  from: "xyz@gmail.com",
  to: 'abc@gmail.com',
  subject: 'Welcome!',
  text: 'Hello, welcome to our social media site!'
};

transporter.sendMail(mailOptions, (err, info) => {
  if(err) console.log(err);
  else console.log('Email sent:', info.response);
});
