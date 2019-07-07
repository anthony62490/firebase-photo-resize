//GCP modules
const { Storage } = require('@google-cloud/storage');
const spawn = require('child-process-promise').spawn;
//OS utilities
const os = require('os');
const path = require('path'); 
const envFilePath = path.join(__dirname, '../.env')
require('dotenv').config({path: path.resolve(envFilePath)});

const suffix = '-small';
const projectId = process.env.PROJECT_ID;
let gcs = new Storage ({projectId});


exports.resizeImage = (event, context) => {
  if(context.eventType === "google.storage.object.finalize"){
    console.log(`Event Overview ${JSON.stringify(event)}`);
    const bucket = event.bucket;
    console.log("Bucket", bucket);
    const contentType = event.contentType;
    console.log("ContentType", contentType);
    const filePath = event.name;
    console.log("filepath =", filePath);

    if (path.basename(filePath).endsWith(suffix)) {
      console.log('File is already small. Skipping.');
      return;
    }

    const destBucket = gcs.bucket(bucket);
    const tmpFilePath = path.join(os.tmpdir(), path.basename(filePath));
    const metadata = { contentType: contentType };
    return destBucket.file(filePath).download({
      destination: tmpFilePath
    }).then(() => {
      return spawn('convert', [tmpFilePath, '-resize', '100x100', tmpFilePath]);
    }).then(() => {
      return destBucket.upload(tmpFilePath, {
        destination: `images/${path.basename(filePath)}${suffix}`,
        metadata: metadata
      })
    });
  }
}
