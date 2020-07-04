var express = require('express');
var mysql = require('mysql');
var dbconfig = require('../config/database.js');
var connection = mysql.createConnection(dbconfig);
var token = require('./token');

var router = express.Router();

router.post('/make', async function(req,res){
    const message = await token.verify(req,res);

    if(typeof(message) === typeof({})){
        if(req.body.group_name === undefined || req.body.group_content === undefined){
            res.status(200).json({
                "status": "400",
                "message": "something data is missing"
            })
            return 0;
        } else {
            var team = {
                "manager": message.id,
                "group_name": req.body.group_name,
                "group_content": req.body.group_content
            }
            connection.query(`Insert into ${dbconfig.database}.group Set ?`, team, function (err,rows,fields) {
                if(err){
                    if(err.sqlMessage === `Duplicate entry '${team.group_name}' for key 'group_name_UNIQUE'`) {
                      res.status(200).json(
                        {
                          "status": "400",
                          "message" : "group_name already exists"
                        }
                      )
                    } else if(err.sqlMessage === "Data too long for column 'group_name' at row 1") {
                          res.status(200).json(
                            {
                              "status": "400",
                              "message": "group_name is too long"
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
                    res.status(200).json(
                      {
                        "status": "200",
                        "message": "insert success"
                      }
                    )
                  }
            })
        }
      } else {
        res.status(200).json({
          "status": "400",
          "message": message
        })
      }
});

router.post('/update', async function(req,res){
  const message = await token.verify(req,res);

  if(typeof(message) === typeof({})){
    if(req.body.group_name === undefined || req.body.group_content === undefined){
        res.status(200).json({
            "status": "400",
            "message": "something data is missing"
        })
        return 0;
    } else {
        var team = {
            "manager": message.id,  
            "group_name": req.body.group_name,
            "group_id": req.body.group_id,
            "group_content": req.body.group_content
        }
        connection.query(`UPDATE ${dbconfig.database}.group SET group_name = "${team.group_name}", group_content = "${team.group_content}" WHERE group_id=${team.group_id} and manager=${team.manager}`, function (err,rows,fields) {
          if(err){
            if(err.sqlMessage === `Duplicate entry '${team.group_name}' for key 'group_name_UNIQUE'`){
              res.status(200).json(
                {
                  "status": "400",
                  "message": "already exist group_name"
                }
              )
            } else if (err.sqlMessage === `Unknown column '${team.manager}' in 'where clause'`){
                res.status(200).json(
                  {
                    "status": "400",
                    "message": "you not manager of group check group_id "
                  }
                )
              } else {
                res.status(200).json(
                  {
                    "status": "200",
                    "message": "update success"
                  }
                )} 
              }
            })
        } 
  } else {
    res.status(200).json({
      "status": "400",
      "message": message
    })
  }
})

router.get('/getdetail', async function(req,res){
  const message = await token.verify(req,res);
  if(typeof(message) === typeof({})){
    connection.query(`SELECT * FROM ${dbconfig.database}.group where group_id = "${req.query.group_id}"`, function(err,rows,fields){
      if(err){
        res.status(200).json({
          "status": "400",
          "message": err
        })
      } else if(rows[0] === undefined){
        res.status(200).json({
          "status": "400",
          "message": "can not find group",
        })
      } else {
        res.status(200).json({
          "status" : "200",
          "message": "successly loaded",
          "data": rows[0]
        })
      }
    })
  } else {
    res.status(200).json({
      "status": "400",
      "message": message
    })
  }
})

router.post('/join', async function(req,res) {
  const message = await token.verify(req,res);
  if(typeof(message) === typeof({})){
    var team = {
      "member_id": message.id,
      "group_id": req.body.group_id
    }
    connection.query(`select * from ${dbconfig.database}.group Where group_id = "${team.group_id}"`, function(err,rows,fields){
      if(rows[0] === undefined){
        res.status(200).json({
          "status": "400",
          "message": "doesn't exist group_id"
        })
      } else {
        connection.query(`select * from my_group where `+`member_id`+` = "${team.member_id}" and `+`group_id`+` = "${team.group_id}"`,  function(err,rows,fields){
          if(rows[0] === undefined ){
            connection.query(`INSERT into ${dbconfig.database}.my_group Set ?`, team, function(err,rows,fields){
              if(err){
                console.log(err)
              } else {
                res.status(200).json({
                  "status": "200",
                  "message": "successly insert"
                })
              }
            })
          }else{
            res.status(200).json({
              "status": "400",
              "message": "already admit group"
            })
          }
        })
      }
    })
  } else {
    res.status(200).json({
      "status": "400",
      "message": message
    })
  }
})

router.get('/getmember', async function(req,res) {
  const message = await token.verify(req,res);
  if(typeof(message) === typeof({})){
    let member = new Array();
    connection.query(`SELECT manager from ${dbconfig.database}.group where group_id= "${req.query.group_id}"`,function(err,rows,fields){
      if(rows[0] === undefined){
        res.status(200).json({
          "status": "400",
          "message": "doesn't match group check group_id"
        })
      } else{
        if(! (req.query.is_volunteer * 1))
          member[0] = {"member_id" : rows[0].manager};
        connection.query(`SELECT * from ${dbconfig.database}.my_group where group_id="${req.query.group_id}" and isVolunteer = ${req.query.is_volunteer}`, function(err,rows,fields){    
          if(err){
            if(err.sqlMessage === "Unknown column 'undefined' in 'where clause'"){
              res.status(200).json({
                "status": "400",
                "message": "empty isVolunteer"
              })
            } else{
              res.status(200).json({
                "status": "400",
                "message": err
              })
            }
          }else if(rows[0] === undefined){
            connection.query(`SELECT * FROM member WHERE member_id = "${member[0].member_id}"`, function(err,rows,fields){
              let data = rows[0];
              if(err){
                res.status(200).json({
                  "status": "400",
                  "message": err
                })
              }else{
                connection.query(`SELECT * from my_skills where member_id = "${member[0].member_id}"`, function(err,rows,fields){
                  let memberSkillsData = rows;
                  connection.query(`Select * from skills`, function(err,rows,fields){
                    let skillsData = rows[0];
                    let skills= []
                    for(let i = 0; i<memberSkillsData.length; i++){
                      skills[i] = Object.keys(skillsData)[Object.values(skillsData).indexOf(String(memberSkillsData[i].skill_number))];
                    }
                    member[0] = { "member_id" : data.member_id, "email" : data.email, "nickname" : data.nickname, "skills" : skills};
                    res.status(200).json({
                      "status": "200",
                      "data": member
                    })
                  })
                })
              }
            })
          }else {
            for(let i=0; i < rows.length; i++){
              if(!req.query.is_volunteer)
                member[i+1] = { "member_id" : rows[i].member_id };
              if(req.query.is_volunteer)
                member[i] = { "member_id" : rows[i].member_id };
            }
            for(let i=0; i < member.length; i++){
              connection.query(`SELECT * FROM member WHERE member_id = "${member[i].member_id}"`, function(err,rows,fields) {
                let data = rows[0];
                if(err){
                    res.status(200).json({
                        "status": "400",
                        "message": err
                    })
                }else{
                    //멤버 기술 불러오기
                    connection.query(`SELECT * from my_skills where member_id = "${member[i].member_id}"`, function(err,rows,fields) {
                        let memberSkillsData = rows;
                        connection.query(`Select * from skills`, function(err,rows,fields){
                            let skillsData = rows[0];
                            let skills= []
                            for(let i = 0; i<memberSkillsData.length; i++){
                                skills[i] = Object.keys(skillsData)[Object.values(skillsData).indexOf(String(memberSkillsData[i].skill_number))];
                            }
                            member[i] = { "member_id" : data.member_id, "email" : data.email, "nickname" : data.nickname, "skills" : skills};
                            console.log(member);
                            if(i+1 === member.length){
                              res.status(200).json({
                                "status": "200",
                                "data": member
                              })
                            }
                        })
                    })
                }
            })
            }
          }
        })
      }
    })
  } else {
    res.status(200).json({
      "status": "400",
      "message": message
    })
  }
})

router.get('/list', async function(req,res){
  const message = await token.verify(req,res);

  if(req.query.page_num === undefined) {
    res.status(200).json({
      "status": "400",
      "message": "no page_number"
    })
    return 0;
  }
  if(typeof(message) === typeof({})){
    req.query.page_num = req.query.page_num * 1;
    let data=[  ];
    if(req.query.is_mine === "1"){
      connection.query(`select * from my_group Where member_id = "${message.id}"`, function(err,rows,fields){
        if(err){
          res.status(200).json({
            "status": "400",
            "message": err
          })
        } else {
          if(rows.length){
            for(let i=0; i<rows.length; i++){
              connection.query(`select * from ${dbconfig.database}.group Where group_id = "${rows[i].group_id}"`, function(err,rows,fields){
                if(err){
                  res.status(200).json({
                    "status": "400",
                    "message": err
                  })
                } else {
                  data[i] = rows[0];
                }
                if(i+1 === rows.length){
                  connection.query(`select * from ${dbconfig.database}.group Where manager = "${message.id}"order by group_id desc limit ${(req.query.page_num - 1) * 10}, ${req.query.page_num *10 };`, function(err,rows,fields){
                    if(err){
                      res.status(200).json({
                        "status": "400",
                        "message": err
                      })
                    }else if(rows[0] === undefined){
                      res.status(200).json({
                        "status": "200",
                        "message": "success",
                        "data": {"memberTeam": [], "managerTeam": [], "next_page": 0}
                      })
                    }else{
                      res.status(200).json({
                        "status": "200",
                        "data": {"memberTeam": data, "managerTeam": rows, "next_page": req.query.page_num + 1}
                      });
                    }
                  })
                };
              })
            }
          }else{
            connection.query(`select * from ${dbconfig.database}.group Where manager = "${message.id}"order by group_id desc limit ${(req.query.page_num - 1) * 10}, ${req.query.page_num *10 };`, function(err,rows,fields){
              if(err){
                console.log(err)
              }else{
                res.status(200).json({
                  "status": "200",
                  "data": {"memberTeam": [], "managerTeam": rows, "next_page": req.query.page_num+1}
                })
              }
            })
          }
        }
      })
    } else if(req.query.is_mine === "0"){
      connection.query(`Select * from ${dbconfig.database}.group order by group_id desc limit ${(req.query.page_num -1) * 10}, ${req.query.page_num * 10};`, function(err,rows,fields){
        if(err){
          res.status(200).json({
            "status": "400",
            "message": err
          })
        }else if(rows[0] === undefined){
          res.status(200).json({
            "status": "200",
            "message": "success", 
            "data": {"rows": [], "next_page": 0}
          })
        }else{
          res.status(200).json({
            "status": "200",
            "data" : {"rows": rows, "next_page": req.query.page_num +1}
          })
        }
      })
    } else{
      res.status(200).json({
        "status": "400",
        "message": "query data invailed"
      })
    }
  } else {
    res.status(200).json({
      "status": "400",
      "message": message
    })
  }
})

router.delete('/delete', async function(req,res){
  const message = await token.verify(req,res);
  if(typeof(message) === typeof({})){
    connection.query(`delete from ${dbconfig.database}.group where manager = "${message.id}" and group_id = "${req.query.group_id}"`, function(err,rows,fields){
      if(err){
        res.status(200).json({
          "status": "400",
          "message": err
        })
      }else{
        if(rows.affectedRows){
          connection.query(`delete from ${dbconfig.database}.my_group where group_id= "${req.query.group_id}"`, function(err,rows,fields){
            if(err){
              res.status(200).json({
                "status": "400",
                "message": err
              })
            }else{
              res.status(200).json({
                "status": "200",
                "message": "successly delte group"
              })
            }
          })
        }else{
          res.status(200).json({
            "status": "400",
            "message": "you not manager this group"
          })
        }
      }
    })
  } else {
        res.status(200).json({
          "status": "400",
          "message": message
        })
      }
})

router.post('/volunteer', async function(req,res){
  const message = await token.verify(req,res);
  if(typeof(message) === typeof({})){
    connection.query(`select * from ${dbconfig.database}.group where manager="${message.id}" and group_id="${req.body.group_id}"`, function(err,rows,fields){
      if(err){
        res.status(200).json({
          "status": "400",
          "message": err
        })
      }
      else{
        if(rows[0]===undefined){
          res.status(200).json({
            "status": "400",
            "message": "no macth data check your input value"
          })
        }else{
          if(req.body.pass==="1"){
            connection.query(`update ${dbconfig.database}.my_group set isVolunteer = 0 where member_id = "${req.body.member_id}"`, function(err,rows,fields){
              if(err){
                res.status(200).json({
                  "status": "400",
                  "message": err
                })
              }else{
                if(rows.affectedRows){
                  res.status(200).json({
                    "status": "200",
                    "message": "successly accept"
                  })
                }else{
                  res.status(200).json({
                    "status": "400",
                    "message": "no volunteer this member_id"
                  })
                }
              }
            })
          }else if(req.body.pass==="0"){
            connection.query(`delete from ${dbconfig.database}.my_group where member_id = "${req.body.member_id}"`, function(err,rows,fields){
              if(err){
                res.status(200).json({
                  "status": "400",
                  "message": err
                })
              } else {
                if(rows.affectedRows){
                  res.status(200).json({
                    "status": "200",
                    "message": "successly fail"
                  })
                }else{
                  res.status(200).json({
                    "status": "400",
                    "message": "no volunteer this member_id"
                  })
                }
              }
            })
          }else{
            res.status(200).json({
              "status": "400",
              "message": "check your pass value"
            })
          }
        }
      }
    })
  } else {
        res.status(200).json({
          "status": "400",
          "message": message
        })
      }
  
})

module.exports = router;