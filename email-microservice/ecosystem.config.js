// ecosystem.config.js (email microservice)
module.exports = {
  apps: [{
    name: 'email-worker',
    script: 'server.js', // your email service entry file
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      EMAIL_PORT: 5001
    },
    error_file: './logs/email-err.log',
    out_file: './logs/email-out.log',
    time: true
  }]
};