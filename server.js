let express = require('express');
let bodyParser = require('body-parser');
let fs = require('fs');
let request = require('request');
var cors = require('cors')
const path = require('path');
const Tabletop = require('tabletop'); //arjunvenkatraman added to load data from Google Sheets directly
let arrayWithData = [];
const app = express();
const port = process.env.PORT || 5000;
const datasrc = "JSON" // "TSV" or "SHEET"
const approvedSheetName = 'People';
app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.urlencoded({
  extended: true
}));

const publicSpreadsheetUrl = "https://docs.google.com/spreadsheets/d/1KZtJDrmyam3LW4cK59ECbL7UKDzvQgWzaJAfyNK9XBI/edit?usp=sharing";

// Datasource check with datasrc var
app.get('/getGraphData', async (req, res) => {
  console.log("Trying to get graph data...")
  if (datasrc === "JSON") {
    let links = await getJSON('./RawData/graphdata.json');
    graph = {"nodes":[],"links":[]}
    nodelookup={}
    links.forEach(link => {
      console.log(link)
      if (!(link.source in nodelookup)) {
        nodelookup[link.source] = 1;
        graph.nodes.push({"id":link.source, "group":Object.keys(nodelookup).length+1});
      }
      if (!(link.target in nodelookup)) {
        nodelookup[link.target] = 1;
        graph.nodes.push({"id":link.target, "group":Object.keys(nodelookup).length+1});

      }
      graph.links.push({"source":link.source,"target":link.target, "weight":link.story, curvature:Math.random(), "year":Number(link.year), "link":link.link})

    })
    console.log("Sending back JSON Response")
    res.send(graph)
  }
  if (datasrc === "SHEET") {
    let revisedJSON = await getSheetData();
    console.log("Sending Sheet Response")
    res.send(revisedJSON)
  }

})

// Pulling from Google Sheets with Tabletop
function getSheetData() {
  return new Promise((resolve) => {
    Tabletop.init({
      key: publicSpreadsheetUrl,
      callback: function(data, tabletop) {
        resolve(processSheetData(tabletop));
      },
      simpleSheet: true
    })
  })
}


//Cleaning up the sheet data
function processSheetData(tabletop) {
  if(tabletop.models[approvedSheetName]){
    let data = tabletop.models[approvedSheetName].elements;
    console.log(data[0])
    let newjson = {"states":{},"totalBlocks":0}
    data.map(currentline => {
        if(!isNaN(currentline['Latitude (°N)']) && !isNaN(currentline['Longitude (°E)'])) {
            if(newjson.states[currentline['State']] !== undefined) {
                newjson.states[currentline['State']].blocks.push({
                    link: "",//currentline['Content URL'],
                    caption: currentline['Name'],
                    //caption: currentline['Caption'],
                    //date: currentline['Event Date'],
                    //protestName: currentline['Protest Name'],
                    //eventType: currentline['Event Type'],
                    //eventLocation: currentline['Event Location'],
                    //sourceURL: currentline['Source URL']
                })
            }
            else {
                newjson.states[currentline['State']] = {
                    blocks: [{
                      link: "", //currentline['Content URL'],
                      caption: currentline['Name'],
                      //date: currentline['Event Date'],
                      //protestName: currentline['Protest Name'],
                      //eventType: currentline['Event Type'],
                      //eventLocation: currentline['Event Location'],
                      //sourceURL: currentline['Source URL']
                    }],
                    coordinates: {
                      latitude: currentline['Latitude (°N)'],
                      longitude: currentline['Longitude (°E)']
                    }
                }
            }
        }
    })
    let sortable = [];
    for (let city in newjson.states) {
        sortable.push([city, newjson.states[city]]);
    }
    sortable.sort((a,b) => (a[1].blocks.length > b[1].blocks.length) ? 1 : ((b[1].blocks.length > a[1].blocks.length) ? -1 : 0));
    let objSorted = {}
    sortable.forEach(function(item){
        objSorted[item[0]]=item[1]
    })
    newjson.states = objSorted
    newjson.totalBlocks = data.length;
    return (newjson)
  }
  else {
    console.log(`No sheet called ${approvedSheetName}`)
    return (`No sheet is called ${approvedSheetName}`)
  }
}

function getJSON(filename) {
  let rawdata = fs.readFileSync(filename);
  let jsondata = JSON.parse(rawdata);
  return jsondata
}


app.get('/graph', async (req, res) => {
  console.log("Trying to get graph data...")
  let links = await getGraphSheetData("graph");
  graph = {"nodes":[],"links":[]}
  nodelookup={}
  links.forEach(link => {
    console.log(link)
    if (!(link.source in nodelookup)) {
      nodelookup[link.source] = 1;
      graph.nodes.push({"id":link.source, "group":Object.keys(nodelookup).length+1});
    }
    if (!(link.target in nodelookup)) {
      nodelookup[link.target] = 1;
      graph.nodes.push({"id":link.target, "group":Object.keys(nodelookup).length+1});

    }
    graph.links.push({"source":link.source,"target":link.target, "weight":link.story, curvature:Math.random(), "year":Number(link.year), "link":link.link})

  })
  res.send(graph)
})



if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, 'client/build')));

  // Handle React routing, return all requests to React app
  app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

app.listen(port, () => console.log(`Listening on port: ${port}`));


//TWITTER EMBED API INFO
// app.post('/getTwitterEmbedInfo', async (req, res) => {
//     console.log("inside getTwitterEmbedInfo")
//     let reqUrl = await buildUrl('https://publish.twitter.com/oembed', {url: req.body.url,theme: 'dark',widget_type: 'video'})
//     request( {url: reqUrl}, (err, resp, body) => {
//         let bodyJSON = JSON.parse(body);
//         console.log(bodyJSON)
//         res.send(bodyJSON)
//     })
// })

// function buildUrl(url, parameters) {
//     return new Promise((resolve, reject) => {
//         let qs = "";
//         for (const key in parameters) {
//             if (parameters.hasOwnProperty(key)) {
//                 const value = parameters[key];
//                 qs +=
//                     encodeURIComponent(key) + "=" + encodeURIComponent(value) + "&";
//             }
//         }
//         if (qs.length > 0) {
//             qs = qs.substring(0, qs.length - 1); //chop off last "&"
//             url = url + "?" + qs;
//         }
//         console.log(url);
//         resolve(url);
//     })
// }
