// MODELS
const Pet = require('../models/pet');

console.log('Environment check:');
console.log('S3_BUCKET:', process.env.S3_BUCKET);
console.log('S3_REGION:', process.env.S3_REGION);
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'Present' : 'Missing');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'Present' : 'Missing');

// UPLOADING TO AWS S3
const multer  = require('multer');
const upload = multer({ dest: 'uploads/' });
const Upload = require('s3-uploader');

const client = new Upload(process.env.S3_BUCKET, {
  aws: {
    path: 'pets/avatar',
    region: process.env.S3_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  cleanup: {
    versions: true,
    original: true
  },
  versions: [{
    maxWidth: 400,
    aspect: '16:10',
    suffix: '-standard'
  },{
    maxWidth: 300,
    aspect: '1:1',
    suffix: '-square'
  }]
});

// PET ROUTES
module.exports = (app) => {

  // INDEX PET => index.js

  // NEW PET
  app.get('/pets/new', (req, res) => {
    res.render('pets-new');
  });

  // CREATE PET
  app.post('/pets', upload.single('avatar'), (req, res, next) => {
    console.log('=== CREATE PET REQUEST ===');
    console.log('Body:', req.body);
    console.log('File:', req.file ? 'File present' : 'No file');
    
    var pet = new Pet(req.body);
    
    pet.save(function (err) {
      if (err) {
        console.log('Pet save error:', err);
        return res.status(400).send({ error: 'Pet validation failed', details: err });
      }
      
      console.log('Pet saved successfully, ID:', pet._id);
      
      if (req.file) {
        console.log('Starting S3 upload for file:', req.file.filename);
        
        client.upload(req.file.path, {}, function (err, versions, meta) {
          if (err) { 
            console.log('S3 upload failed:', err);
            return res.status(400).send({ error: 'S3 upload failed', details: err }) 
          }
          
          console.log('S3 upload successful:', versions);
          
          // Fix: Only use the first version URL and save once
          if (versions.length > 0) {
            var urlArray = versions[0].url.split('-');
            urlArray.pop();
            var url = urlArray.join('-');
            pet.avatarUrl = url;
            
            pet.save(function(saveErr) {
              if (saveErr) {
                console.log('Avatar URL save error:', saveErr);
              }
              res.send({ pet: pet });
            });
          } else {
            res.send({ pet: pet });
          }
        });
      } else {
        console.log('No file to upload');
        res.send({ pet: pet });
      }
    });
  });

  // SHOW PET
  app.get('/pets/:id', (req, res) => {
    Pet.findById(req.params.id).exec((err, pet) => {
      res.render('pets-show', { pet: pet });
    });
  });

  // EDIT PET
  app.get('/pets/:id/edit', (req, res) => {
    Pet.findById(req.params.id).exec((err, pet) => {
      res.render('pets-edit', { pet: pet });
    });
  });

  // UPDATE PET
  app.put('/pets/:id', (req, res) => {
    Pet.findByIdAndUpdate(req.params.id, req.body)
      .then((pet) => {
        res.redirect(`/pets/${pet._id}`)
      })
      .catch((err) => {
        // Handle Errors
      });
  });
  
  // SEARCH PET
  app.get('/search', (req, res) => {
    const term = new RegExp(req.query.term, 'i')
    const page = req.query.page || 1
    
    Pet.paginate(
      {
        $or: [
          { 'name': term },
          { 'species': term }
        ]
      },
      { page: page }).then((results) => {
        res.render('pets-index', { pets: results.docs, pagesCount: results.pages, currentPage: page, term: req.query.term });
      });
  });

  // DELETE PET
  app.delete('/pets/:id', (req, res) => {
    Pet.findByIdAndRemove(req.params.id).exec((err, pet) => {
      return res.redirect('/')
    });
  });
}