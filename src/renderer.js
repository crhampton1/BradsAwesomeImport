const {ipcRenderer} = require('electron')
var electron = require('electron').remote;
var log = require("electron-log");



const submitListner = document
    .querySelector('form')
    .addEventListener('submit', (event) => {
        event.preventDefault()

        const files = [...document.getElementById('filePicker').files]
        const filesFormated = files.map(({name, path: pathName}) => ({
            name,
            pathName
        }))
        log.log(filesFormated)
        ipcRenderer.send('files', filesFormated)
    })

    ipcRenderer.on('metadata', (event, response) => {
        const pre = document.getElementById('data')
        var successCode = response[0].body.replace('<jobId>', "")
        successCode = successCode.replace("</jobId>", "")
        pre.innerText =  "Done! Code from BR: " + successCode
        log.info(response[0].body)
    })

    ipcRenderer.on('metadata:error', (event, error) => {
        const pre = document.getElementById('data')

        pre.innerText = "Error: " + error
        log.error("Renderer" + error)
    });

    