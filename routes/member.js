var express = require('express');
var token = require('./token');
var mysql = require('mysql');
var dbconfig = require('../config/database.js');
var connection = mysql.createConnection(dbconfig);

var router = express.Router();

router.post('/', async function(req,res,next) {
    const isLogin = await token.verify(req,res,next);

    if(isLogin.iss !== "worktogether.com"){
        res.status(200).json({
            "status": "400",
            "message": isLogin 
        })
    }else{
        connection.query(`UPDATE member SET email = "${req.body.email}", nickname = "${req.body.nickname}" WHERE member_id ="${isLogin.id}"`, function (err,rows,fields) {
            if(err){
                if(err.sqlMessage === `Duplicate entry '${req.body.email}' for key 'email_UNIQUE'`){
                    res.status(200).json(
                        {
                            "status": "400",
                            "message": "already exist email"
                        }
                    )
                } else if(err.sqlMessage === `Duplicate entry '${req.body.nickname}' for key 'nickname_UNIQUE'`){
                    res.status(200).json(
                        {
                            "status": "400",
                            "message": "already exist nickname"
                        }
                    )
                } else {
                    res.status(200).json(
                        {
                            "status": "400",
                            "message": err
                        }
                    )
                }
            } else {
                connection.query('SELECT * FROM skills' , function(err,rows,fields) {
                    const data = rows[0]
                    let my_skills= new Array();
                    for(let i=0; i< req.body.skills.length; i++){
                        my_skills[i] = data[req.body.skills[i]];
                    }
                    connection.query(`SELECT * FROM my_skills where member_id = "${isLogin.id}"` ,function(err, rows, fields){
                        for(let i =0; i < rows.length;i++){
                            connection.query(`UPDATE my_skills set skill_number = "${my_skills[i]}" where my_skills_id = "${rows[i].my_skills_id}"`, function(err,rows,fields){
                                if(err){
                                    res.status(200).json(
                                        {
                                            "status": "400",
                                            "message": err
                                        }
                                    )
                                    return 0;
                                }
                            })
                        }
                        res.status(200).json({
                            "status": "200",
                            "message": "success"
                        })
                    })
                })

            }
        })
    }
})

router.get('/', async function(req,res,next){
    const isLogin = await token.verify(req,res,next);
    //토큰확인
    if(isLogin.iss !== "worktogether.com"){
        res.status(200).json({
            "status": "400",
            "message": isLogin 
        })
    }else{
        //멤버 정보 불러오기
        connection.query(`SELECT * FROM member WHERE member_id = "${isLogin.id}"`, function(err,rows,fields) {
            let data = rows[0];
            if(err){
                res.status(200).json({
                    "status": "400",
                    "message": err
                })
            }else{
                //멤버 기술 불러오기
                connection.query(`SELECT * from my_skills where member_id = "${isLogin.id}"`, function(err,rows,fields) {
                    let memberSkillsData = rows;
                    connection.query(`Select * from skills`, function(err,rows,fields){
                        let skillsData = rows[0];
                        let skills= []
                        for(let i = 0; i<memberSkillsData.length; i++){
                            skills[i] = Object.keys(skillsData)[Object.values(skillsData).indexOf(String(memberSkillsData[i].skill_number))];
                        }
                        res.status(200).json(
                            {
                                "status": "200",
                                "data": 
                                    {
                                        "member_id": data.member_id,
                                        "nickname": data.nickname,
                                        "email": data.email,
                                        "skills": skills
                                    }
                            }
                        )
                    })
                })
            }
        })
    }
})

module.exports = router;