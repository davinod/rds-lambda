'use strict';

process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT']

console.log('Loading function');

const aws = require('aws-sdk');

const s3 = new aws.S3({ apiVersion: '2006-03-01' });

var pg = require('pg');
var response = require('cfn-response');

exports.handler = function (event, context) {
    
    console.log('REQUEST RECEIVED:\n', JSON.stringify(event));

    if (event.RequestType == 'Delete'){
        responseData = {Message: "No actions need to be performed."};
        console.log(responseData);
        response.send(event, context, response.SUCCESS, responseData);
        return;
    }

    const s3bucket = event.ResourceProperties.S3bucket;
    const s3key = event.ResourceProperties.S3key;
    const dbconn = event.ResourceProperties.Dbconn;

    var responseData = {};
    
    console.log ("S3 Bucket: ", s3bucket);
    console.log ("S3 Key   : ", s3key);
    console.log ("dbconn   : ", dbconn);
    
    const params = {
        Bucket: s3bucket,
        Key: s3key,
    };
    
    console.log ("Retrieving sql file from ", s3key, "from bucket ", s3bucket, "...");
    
    s3.getObject(params, (err, data) => {
        if (err) {
            responseData = {Error: "Failed to retrieve file" + s3key + " from bucket " + s3bucket};
            console.log(responseData);
            response.send(event, context, response.FAILED, responseData);
            return;
        } else {
            console.log(" --> ", s3key, " successfully loaded from s3 bucket", s3bucket);
            var sql = data.Body.toString('ascii');
            console.log('CONTENT RETRIEVED:\n', sql);
            console.log("\n\nEstablishing connection to the database...");
            pg.connect(dbconn, function(err, client, done) {
                if (err) {
                    responseData = {Error: "Failed to connect to the database"};
                    console.log(responseData);
                    response.send(event, context, response.FAILED, responseData);
                    return;
                }
                console.log (" --> Connected to the database.");
                console.log ("Executing sql command from ", s3key, " ...");

                client.query(sql, function(err, results) {
                   done();
                   if (err) {
                        responseData = {Error: "Error running sql command"};
                        console.log(responseData);
                        response.send(event, context, response.FAILED, responseData);
                        return;
                   }
                    console.log (" --> sql command executed successfully.");
                    responseData = {Info: "Process finished successfully."};
                    console.log(responseData);
                    response.send(event, context, response.SUCCESS, responseData);
                    return;
                });
            });
        }
    });
}
