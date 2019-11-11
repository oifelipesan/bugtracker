const path = require('path')
const express = require('express')
const { promisify } = require('util')
const sgMail = require('@sendgrid/mail')
const bodyParser = require('body-parser')
const GoogleSpreadsheet = require('google-spreadsheet')

require('dotenv').config()

const credentials = require('./src/config/bugtracker.json')
const { docId, worksheetIndex } = require('./src/config')
const sendGridKey = process.env.SENDGRID_API_KEY

const port = process.env.PORT || 3000
const app = express()

app.set('view engine', 'ejs')
app.set('views', path.resolve(__dirname, 'src', 'views'))

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use('/public', express.static(path.resolve(__dirname, 'src', 'public')))

app.get('/', (req, res) => {
  return res.render('home', { title: 'Bug Tracker' })
})

app.post('/', async (req, res) => {
  req.body.source = req.query.source || 'direct'

  try {
    const doc = new GoogleSpreadsheet(docId)
    await promisify(doc.useServiceAccountAuth)(credentials)

    const info = await promisify(doc.getInfo)()
    const worksheet = info.worksheets[worksheetIndex]

    await promisify(worksheet.addRow)(req.body)

    if (req.body.issueType === 'CRITICAL') {
      sgMail.setApiKey(sendGridKey)
      const msg = {
        to: 'felipesan.cwb@gmail.com',
        from: `${req.body.email}`,
        subject: 'Critical bug reported',
        text: `User ${req.body.name} has reported an bug`,
        html: `
        <h1>User ${req.body.name} has reported an bug</h1>
        <p>How to reproduce: ${req.body.howToReproduce}<br>
        Expected output: ${req.body.expectedOutput}<br>
        Received output: ${req.body.receivedOutput}<br>
        User agent: ${req.body.userAgent}<br>
        User date: ${req.body.userDate}</p>
        `
      }
      await sgMail.send(msg)
    }

    return res.render('success', { title: 'Bug Tracker' })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Erro ao enviar formulário' })
  }
})

app.listen(port, err => {
  if (err) console.log('Error')
  else console.log(`Server in running on port ${port}`)
})
