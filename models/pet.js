"use strict";

const mongoose = require('mongoose'),
        Schema = mongoose.Schema;

const mongoosePaginate = require('mongoose-paginate');

mongoosePaginate.paginate.options = {
  limit: 3 // how many records on each page
};

const PetSchema = new Schema({
    name            : { type: String, required: true }
  , birthday        : { type: String, required: true }
  , species         : { type: String, required: true }
  , picUrl          : { type: String }
  , picUrlSq        : { type: String }
  , avatarUrl       : { type: String }
  , favoriteFood    : { type: String, required: true }
  , description     : { type: String, minlength: 140, required: true }
  , price           : { type: Number, required: true }
},
{
  timestamps: true
});

// Add full-text search index with weights
PetSchema.index({ 
  name: 'text', 
  species: 'text', 
  favoriteFood: 'text', 
  description: 'text' 
}, {
  name: 'Pet text index', 
  weights: {
    name: 10, 
    species: 4, 
    favoriteFood: 2, 
    description: 1
  }
});

PetSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Pet', PetSchema);