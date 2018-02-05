const express = require("express");
var app = express();
var validUrl = require('valid-url');
var MongoClient = require("mongodb").MongoClient;
var url = process.env.MONGODB_URL;
var $ = require('jquery');
var urlInfo = {
  long: "",
  short: ""
};

app.get("/", (request, response)=>
{
  if(request.query.url==undefined || request.query.url==null)
  {
    response.sendFile(__dirname + "/views/index.html");  
  }
  else
  {
    executeUrlShortener(request,response);
  }
})

app.get("/:url",(request, response)=>{
  MongoClient.connect(url,function(error, database)
    {
      if(error) throw error;
      else
      {
        var databaseObject = database.db("fcc_node_challenge_one");
        
        databaseObject.collection("urlinfo").find({short:"https://url-shortener-microservice-fcc-three.glitch.me/"+request.params.url}).limit(1).next(function(err, result)
        {
          if(err) return(err);
          if (result !=undefined && result != null)
          {
            database.close();
            response.redirect(result.long);
          } 
          else 
          {
            executeUrlShortener(request, response);
          }
        });
      }
    });
});

//app.get("/output/",(request, response)=>
function executeUrlShortener(request, response)
{ 
  //urlInfo.long = request.params.url;
  urlInfo.long = request.query.url;
  urlInfo.short = generateRandomNumber();
  if(!validUrl.isUri(urlInfo.long))
  {
    urlInfo.short="Invalid Url sent in the request!";
    if(urlInfo._id != null)
    {
       delete urlInfo._id;
    }
    response.json(urlInfo);
  }
  else
  {
    callPromise(urlInfo).then(function (fulfilled) 
    {
      response.send(fulfilled);
    }).catch(function (error) 
    {
        urlInfo.short = "https://url-shortener-microservice-fcc-three.glitch.me/"+urlInfo.short;
        insertNewRecord(urlInfo);
        response.send(urlInfo);
    });
  }
};
//});

//Application port connectivity
app.listen(3000, ()=>
{
  console.log("Running on port 3000!");
});

function callPromise(urlInfo)
{
  return new Promise(
      function(resolve, reject)
      {
          var checker = false;
          var originalInfo = urlInfo;
          MongoClient.connect(url,function(error, database)
          {
            if(error) throw error;
            else
            {
              var databaseObject = database.db("fcc_node_challenge_one");
              if(urlInfo._id != null)
              {
                 delete urlInfo._id;
              }
              databaseObject.collection("urlinfo").find({long:urlInfo.long}).limit(1).next(function(err, result)
              {
                if(err) return(err);
                if (result !=undefined && result != null)
                { 
                  originalInfo.short = result.short;
                  database.close();
                  checker = true;  
                } 
                else 
                {
                  //console.log("No record found! Inserting into database!");
                  urlInfo.short = verifyGeneratedRandomNumber(databaseObject, database, urlInfo);
                  checker = false;
                }
                if(checker)
                {
                  //console.log(originalInfo.short);
                  resolve(originalInfo);
                }
                else 
                {
                  reject(urlInfo);
                }
                
              });
            }
          });          
      }
  );
}

function insertNewRecord(urlInfo)
{
  MongoClient.connect(url,function(error, database)
  {
    if(error) throw error;
    else
    {
      var databaseObject = database.db("fcc_node_challenge_one");
      databaseObject.collection("urlinfo").insertOne(urlInfo, function(err, result)
      {
        if(err) throw err;
        else
        {
          //console.log("1 document Inserted! "+urlInfo.long+urlInfo.short);
          database.close();
          
          return urlInfo;
        }
      });
    }
  });
};


function verifyGeneratedRandomNumber(databaseObject, database, urlInfo)
{
      databaseObject.collection("urlinfo").find({short:urlInfo.short}).limit(1).next(function(err, result)
      {
        if(err) throw err;
        if (result) 
        {
          //console.log("Generated Random number exists. Retrying!");
          urlInfo.short = generateRandomNumber();
          verifyGeneratedRandomNumber(databaseObject, database, urlInfo);
          database.close();
        } 
        else 
        {
          //console.log("Generated Random number is unique!");
        }
      });
    return urlInfo.short;
}

function generateRandomNumber()
{
  var randomNumber= Math.floor((Math.random() * 20000) + 1);
  return randomNumber;
}
