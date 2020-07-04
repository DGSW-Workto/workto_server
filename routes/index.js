var express = require('express');
var mysql = require('mysql');
var dbconfig = require('../config/database.js');
var connection = mysql.createConnection(dbconfig);
var crypto = require('crypto');
var async = require('async');
var jwt = require('jsonwebtoken');
var config = require('../config/config');
var token = require('./token');



var router = express.Router();

function Makehash(password){
  return new Promise(function(res, rej){
    crypto.randomBytes(66, (err, buf) => {
      crypto.pbkdf2(password, buf.toString('base64'), 163437, 66, 'sha512',  (err, key) => {
        const data = [key.toString('base64'), buf.toString('base64')];
        res(data);
      })
    });
  })
}

function MakeJWT(id){
  return new Promise(function(res,rej){
    jwt.sign(
      {
        "id": id
      },
      config.secret,
      {
        expiresIn: '1d',
        issuer: 'worktogether.com'
      }, (err, token) => {
        if (err) rej(err)
        res(token)
      }
    )
  })
}

router.post('/join', async function(req,res) {
  const body = req.body;
  if(body.password === undefined) {
    res.status(200).json(
      {
        "status": "400",
        "message" : "no password"
      }
    )
    return 0;
  }else if(body.member_id === undefined) {
    res.status(200).json(
      {
        "status": "400",
        "message" : "no member_id"
      }
    )
    return 0;
  
  }else if(body.nickname === undefined) {
    res.status(200).json(
      {
        "status": "400",
        "message" : "no nickname"
      }
    )
    return 0;

  }else if(body.skills === undefined) {
    res.status(200).json(
      {
        "status": "400",
        "message" : "no skills"
      }
    )
    return 0;
  }else if(body.email === undefined) {
    res.status(200).json(
      {
        "status": "400",
        "message" : "no email"
      }
    )
    return 0;
  }


  var data;
  data  =  await Makehash(body.password);

  var users = {
    "member_id": body.member_id,
    "salt": data[1],
    "hash": data[0],
    "nickname": body.nickname,
    "email": body.email
  }

  connection.query('INSERT INTO member SET ?', users, function (err, rows, fields) {
    if(err){
      if(err.sqlMessage === `Duplicate entry '${users.member_id}' for key 'PRIMARY'`) {
        res.status(200).json(
          {
            "status": "400",
            "message" : "ID already exists"
          }
        )
      } else if (err.sqlMessage === `Duplicate entry '${users.email}' for key 'email_UNIQUE'`) {
          res.status(200).json(
            {
              "status": "400",
              "message" : "email already exists"
            }
          )
        } else if (err.sqlMessage === `Duplicate entry '${users.nickname}' for key 'nickname_UNIQUE'`){
            res.status(200).json(
              {
                "status": "400",
                "message" : "nickname already exists"
              }
            )
          } else {
              res.status(200).json(
                { 
                  "status": "400",
                  "message" : "unknown error",
                  "sqlMessage": err.sqlMessage
                }
              )
              return 0;
            }
    } else {
        for(let i=0; i < body.skills.length; i++){
          connection.query('Select * from skills ', function (err,rows,fields){
            data = rows[0];  
            queryData = {"member_id": body.member_id,
                        "skill_number": data[body.skills[i]]};
            connection.query('Insert INTO my_skills Set ?', queryData, function(err,rows,fields){
              if(err){
                res.status(200).json(
                  {
                    "status": "400",
                    "message": err
                  }
                )
              }
            })
          })
        }
      res.status(200).json(
        {
          "status": "200",
          "message" : "register success"
        }
      )
    }
  })

})  


router.post('/login', async function(req, res) {
  const id = req.body.id;
  const pwd = req.body.pwd;
  if(id === undefined || id === ""){
    res.status(200).json(
      {
        "status": 400,
        "message" : "id is empty"
      }
    )
    return 0; 
  }

  if(pwd === undefined || pwd === ""){
    res.status(200).json(
      {
        "status": 400,
        "message" : "pwd is empty"
      }
    )
    return 0; 
  }

  connection.query(`SELECT * FROM member WHERE member_id = '${id}'`, function (err,rows,fields) {
    if(err){
      if(err.sqlMessage === `Unknown column '${id}' in 'where clause'`){
        res.status(200).json(
          {
            "status": "400",
            "message" : "id error"
          }
        )
        return 0;
      } else {
          res.status(200).json(
            {
              "status": "400",
              "message": err
            }
          );
        }
    } else if(rows[0]===undefined){
      res.status(200).json({
        "status": "400",
        "message": "don't macth id or pwd"
      })
    } else {
      crypto.pbkdf2(pwd, rows[0].salt, 163437, 66, 'sha512',  async(err, key) => {
        if(rows[0].hash === key.toString('base64')){
            const token = await MakeJWT(rows[0].member_id);
            res.status(200).json(
              {
                "status": "200",
                "message": "login success",
                "data":{
                  "token": token 
                }
              }
            )
        } else{
          res.status(200).json(
            {
              "status": "400",
              "message": "can't match password"
            }
          )
        }
      })
    } 
  })
});

router.get('/token',  async function (req, res, next){
  const message = await token.verify(req,res,next);

  if(typeof(message) === typeof({})){
    res.status(200).json({
      "status": "200",
      "data": message 
    })
  } else {
    res.status(200).json({
      "status": "400",
      "message": message
    })
  }
})

module.exports = router;
