var bootweb = require("bootweb"),
  Schema = bootweb.mongoose.Schema,
  ObjectId = Schema.ObjectId,
  crypto = require('crypto'),
  Template = new Schema({
    name: {
      type: String,
      required: true,
      index: {
        sparse: true
      }
    },
    source: {
      type: String
    },
    elements: {}
  }, {strict: false}),
  Newsletter = new Schema({

    name: {
      type: String,
      required: true,
      index: {
        sparse: true
      }
    },
    content: {
      type: String,
      required: true,
      index: {
        sparse: true
      }
    },
    template: { type:ObjectId},
    creation_date: Date,
    creator: { type:ObjectId},
    validated: Boolean,
    validator: { type:ObjectId},
    validation_date: Date,
    published: Boolean,
    publisher: { type:ObjectId},
    publication_date: Date,

  }, {
    strict: false
  });

//template.markModified('element');
bootweb.mongoose.model('NewsletterTemplate', Template);
bootweb.mongoose.model('Newsletter', Newsletter);