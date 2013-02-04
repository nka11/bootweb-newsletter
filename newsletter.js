/*

bootweb-newsletter - Newsletter tool module for bootweb
Copyright (C) $year Nicolas Karageuzian

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

*/
var bootweb = require('bootweb'),
  conn, Template, Newsletter,
  logger = bootweb.getLogger('bootweb-newsletter'),
  _ = require("util"),
  EventEmitter = require('events').EventEmitter,
  newsletter = new EventEmitter();
  

newsletter.init = function(options, cb) {
  logger.info("Starting newsletter initialization");
  if (cb == null && typeof options === "function") {
    cb = options;
    options = {
      "prefix": "/newsletter/"  
    };
  }
  if (options === undefined) {
    options = {
      "prefix": "/newsletter/"  
    };
  }
  if (typeof options.prefix === "undefined") {
    options.prefix = "/newsletter/";
  }
  logger.info("Adding templates dir : " + __dirname + "/templates");
  bootweb.templatesDirs.push(__dirname + "/templates");
  this.options = options;
  cb(null, newsletter);
}

/**
 * Load default template
 * 
 */
function loadTemplates(cb) {
  logger.info("Initializing templates");
  Template.findOne({name:"newsletter"}, function(err, template) {
    if (err != null) {
      return cb(err);
    }
    if (template == null) {
      template = new Template({
        name: "newsletter",
        source: bootweb.swig.compileFile("mails/newsletter.html").render({})
      });
      return template.save(function(err){
        if (err != null) {
          return cb(err)
        }
        cb(err,template);
      })
    }
    cb(err,template);
  });
}

/**
 * gets the list of templates
 */
function getTemplates(cb) {
  logger.info("get template list");
  Template.find(function(err, templates) {
    logger.debug("Query result : " + _.inspect({err:err, templates:templates}));
    if (err !== null) {
      return cb(err);
    }
    return cb(null, templates);
  })
}

/**
 * Send a newletter test to recipient
 */
function sendNl(email, subject, body, callback) {
  bootweb.sendMail({
    text: "Newsletter",
    from: bootweb.conf.get('email:template:system:from'),
    to: email,
    //cci:     nconf.get('email:template:system:cci'),
    subject: subject,
    attachment: [{
      data: body,
      alternative: true
    }]
  }, function(err) {
    if (err !== null) {
      logger.debug(_.inspect(err));
    }
    if (typeof callback === "function") {
      callback(err);
    }
  });

}


bootweb.on("ready", function(){
  
  conn = bootweb.getConnection();
  require("./model");
  Template = conn.model("NewsletterTemplate");
  Newsletter = conn.model("Newsletter");
  loadTemplates(function(){});
  
  /**
   * Initializing newsletter io events and interactions
   */
  bootweb.io.of(newsletter.options.prefix).on("connection", function(socket) {
    if (socket.handshake.user != null && socket.handshake.user.email !== "anonymous") {
      socket.on("sendNl", function(data) {
        sendNl(socket.handshake.user.email, "NewsLetter", data.emailBody, function(err) {
          logger.debug(arguments);
          socket.emit("sentNL", err);
        });
      });
      socket.on("getTemplates", function(){
        getTemplates(function(err, data) {
          socket.emit("TemplatesList",data);
        })
      });
      socket.on("saveTemplate", function(tpl){
        Template.findOne({name:tpl.name}, function(err,template) {
          if (err != null) {
            return;
          }
          if (template != null) {
            template.source = tpl.source;
            template.save(function(err) {
              if (err != null) {
                return;
              }
              getTemplates(function(err, data) {
                socket.emit("TemplatesList",data);
              });
            });
          }
        });
      });
    } else {
      socket.emit("NotConnected");
    }
  });
})
newsletter.mapUrls = function(app, cb){
  app.get(newsletter.options.prefix, function(req, res, next) {
    res.render('edit_ml.html', {
      user: req.user
    });
  });
  app.post(newsletter.options.prefix + "send", bootweb.auth.verify(), function(req, res, next) {
    sendNl(req.user.email, "NewsLetter", req.body.email, function(err) {
      logger.debug(arguments);
      if (err !== null) {
        logger.info(_.inspect(err));
        if (req.is('json')) {
          return res.json({
            success: false,
            err: err
          });
        }
        return bootweb.renderError(req, res, {
          err: "failed to send email <pre>" + _.inspect(err) + "</pre>",
          code: 500
        });
      }
      if (req.is('json')) {
        return res.json({
          success: true,
          message: "Mail sent to email",
          email: req.user.email
        });
      }
      res.send("ok");
    });
  });
}

module.exports = newsletter;