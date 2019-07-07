//Firebase/GCP modules
const { Storage } = require('@google-cloud/storage');
//OS utilities
const os = require('os');
const path = require('path'); 
const envFilePath = path.join(__dirname, '../.env')
require('dotenv').config({path: path.resolve(envFilePath)});

const spawn = require('child-process-promise').spawn;
const suffix = '-small';
const projectId = process.env.PROJECT_ID;
let gcs = new Storage ({projectId});


exports.resizeImage = (event, context) => {
  if(context.eventType === "google.storage.object.finalize"){
    console.log(`Event Overview ${event}`);
    console.log(`Context Overview ${context}`);
    const bucket = event.bucket;
    console.log("Bucket", bucket);
    const contentType = event.contentType;
    console.log("ContentType", contentType);
    const filePath = event.name;
    console.log('FIREBASE INDEX: File change detected. Executing function');
    console.log("filepath =", filePath);

    if (event.resourceState && event.resourceState === 'not_exists') {
      console.log('File deleted sucessfully');
      return;
    }

    if (path.basename(filePath).endsWith(suffix)) {
      console.log('File has already been altered. Take no action');
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

// Deployment Command
// 1. Select <PROJECT-NAME> with gcloud
// 2. Run: gcloud functions deploy resizeImage --runtime nodejs8 --trigger-resource <PROJECT-NAME>.appspot.com --trigger-event google.storage.object.finalize