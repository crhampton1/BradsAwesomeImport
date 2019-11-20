const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const util = require('util')
const fs = require('fs')
const excelToJson = require('convert-excel-to-json');
const log = require('electron-log');
const { autoUpdater } = require("electron-updater")



const { convertArrayToCSV } = require('convert-array-to-csv');
const request = require('request')

autoUpdater.checkForUpdatesAndNotify()


let win
const requestsPromise = util.promisify(request.post)

function createWindow () {

  win = new BrowserWindow({
    width: 500,
    height: 300,
    webPreferences: {
      nodeIntegration: true
    }
  })

  const htmlPath = path.join('src','index.html')
 
  win.loadFile(htmlPath)


  //win.webContents.openDevTools()


  win.on('closed', () => {

    win = null
  })
}


app.on('ready', createWindow)


// Quit when all windows are closed.
app.on('window-all-closed', () => {
 
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {

  if (win === null) {
    createWindow()
  }
})


ipcMain.on('files', async (event, filesArr) => {
  try{




    const data = await Promise.all(
      filesArr.map(async({pathName })=> ({
        ...await  DoTheExcelFunction(pathName)
      }))
    )
    win.webContents.send('metadata', data)
  } catch (error) {
    win.webContents.send('metadata:error', error)
  }
})

async function DoTheExcelFunction(pathName) {
  try {
    
    var fileExtension = pathName.substring(pathName.length - 7).split('.')
    if( fileExtension[1] != "xls" && fileExtension[1] != "xlsx"){
      throw new Error("Wrong file type!");
    }

   var JsonConverted = await excelToJson({
          source: fs.readFileSync(pathName),
          header:{
            rows: 1
        },
          columnToKey: {
            '*': '{{columnHeader}}'
          } 
        })
    
   
    var data2 = []
   
    var i = 0;
    

  

    for await (eachField of JsonConverted.Sheet1){
      var newObject = {
        Church: '',
        Organizations: '',
        People: '',
        Title: eachField.Title,
        AccountLongName: '',
        CurrentValue: eachField.CurrentValue,	
        LastYearValue: eachField.LastYearValue,
        InvestmentType: eachField.InvestmentType
      }
      
      var addOrNot = true;

      if(eachField.Id.substring(eachField.Id.length -1).toUpperCase() == "C"){
        newObject.Church = eachField.Id.substring(0, eachField.Id.length -1);
        
      } else if (eachField.Id.substring(eachField.Id.length -1).toUpperCase() == "O"){
        newObject.Organizations = eachField.Id.substring(0, eachField.Id.length -1);
        
      } else if (eachField.Id.substring(eachField.Id.length -1).toUpperCase() == "I"){
        newObject.People = eachField.Id.substring(0, eachField.Id.length -1) 
      } else {
        
        log.error("Missing C - O - I - ID: " + eachField.Id);
        addOrNot = false;
      }

      if((eachField.AccountLongName2 != null && eachField.AccountLongName3 != null) || (eachField.AccountLongName2 != undefined && eachField.AccountLongName3 != undefined)){
        newObject.AccountLongName = eachField.AccountLongName + ' ' + eachField.AccountLongName2 + ' ' + eachField.AccountLongName3
      } else if ((eachField.AccountLongName2 != null && eachField.AccountLongName3 == null) || (eachField.AccountLongName2 != undefined && eachField.AccountLongName3 == undefined)){
        newObject.AccountLongName = eachField.AccountLongName + ' ' + eachField.AccountLongName2
      } else {
        newObject.AccountLongName = eachField.AccountLongName
      }

      if(addOrNot){
        data2.push(newObject);
      }
      
    }
   
   
    const csvFromArrayOfObjects = await convertArrayToCSV(data2);
  
    var buf = Buffer.from(csvFromArrayOfObjects, 'utf8')
   

    var formData = {
      'file': {
        value: buf,
        options: {
          filename: 'upload',
          contentType: 'text/csv'
        }
      }
    }

   
    const response = await requestsPromise({url:'https://wnc-data.brtapp.com/import/31f96c453b2948a195c984a98fb7f302/foundationaccounts.csv', formData: formData})
    

    return response

  } catch (error) {
    win.webContents.send('metadata:error', error)
    log.error(error)
  }
} 