const sg = require('sendgrid')(process.env.SENDGRID_API_KEY)

const request = (message) => sg.emptyRequest({
  method: 'POST',
  path: '/v3/mail/send',
  body: {
    personalizations: [
      {
        to: [
          {
            email: 'pepegombos@gmail.com',
          },
        ],
        subject: 'Pulse - Scraper Warning!',
      },
    ],
    from: {
      email: 'noreply@abspulse.com',
    },
    content: [
      {
        type: 'text/plain',
        value: message,
      },
    ],
  },
})

//With promise
const send = (message) =>
  sg.API(request(message))
    .then(response => {
      console.log('Email sent.')
      return response
    })
    .catch(error => {
      //error is an instance of SendGridError
      //The full response is attached to error.response
      console.log(error.message)
    })

export default send
