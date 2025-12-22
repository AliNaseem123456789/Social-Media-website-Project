import transporter from './mailer.js';

const mailOptions = {
  from: "alinaseem011235@gmail.com",
  to: 'alinaseem21102002@gmail.com',
  subject: 'Welcome!',
  text: 'Hello, welcome to our social media site!'
};

transporter.sendMail(mailOptions, (err, info) => {
  if(err) console.log(err);
  else console.log('Email sent:', info.response);
});
