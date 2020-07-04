var express = require('express');
var mysql = require('mysql');
var dbconfig = require('../config/database.js');
var connection = mysql.createConnection(dbconfig);
var token = require('./token');
var multer = require('multer');

var router = express.Router();

const type  = [ { name: 'image' } ];


const upload = multer({
    storage: multer.diskStorage({
        destination: (req,file,cb) => {
            cb(null, 'uploads/');
        },
        filename: (req,file,cb) => {
            cb(null,new Date().valueOf() + file.originalname);
        },
    }),
});

router.post(`/make`, upload.fields(type),async function(req,res){
    const message = await token.verify(req,res);
    if(typeof(message) === typeof({})){
        connection.query(`select * from ${dbconfig.database}.group where manager="${message.id}" and group_id="${req.body.group_id}"`, function(err,rows,fields){
            if(err){
                res.status(200).json({
                    "status": "200",
                    "message": err
                })
            } else {
                if(rows[0]===undefined){
                    res.status(200).json({
                        "status": "400",
                        "message": "no match data check your input value"
                    })
                } else {
                    let date = new Date();
                    var post = {
                        title: req.body.title,
                        content: req.body.content,
                        create_date: date.toLocaleString(),
                        group_id: req.body.group_id,
                        count: req.body.count
                    }
                    connection.query(`insert into ${dbconfig.database}.post Set ?`, post, function(err,rows,fields){
                        if(err){
                            if(err.sqlMessage === "Column 'content' cannot be null"){
                                res.status(200).json({
                                    "status": "400",
                                    "message": "content is empty"
                                })
                            }else if(err.sqlMessage === "Column 'title' cannot be null"){
                                res.status(200).json({
                                    "status": "400",
                                    "message": "title is empty"
                                })
                            }else if(err.sqlMessage === "Column 'count' cannot be null"){
                                res.status(200).json({
                                    "status": "400",
                                    "message": "count is empty"
                                })
                            }else{
                                res.status(200).json({
                                    "status": "400",
                                    "message": err
                                })
                            }
                        } else {
                            if(req.files.image === undefined){
                                res.status(200).json({
                                    "status": "200",
                                    "message": "successly post"
                                })
                            } else {
                                for(let i=0;i<req.files.image.length;i++){
                                    const post_image = {
                                        "post_id": rows.insertId,
                                        "image_path": "/image/"+req.files.image[i].filename
                                    }
                                    connection.query(`insert into ${dbconfig.database}.post_images Set ?`,post_image, function(err,rows,fields){
                                        if(err){
                                            res.status(200).json({
                                                "status": "400",
                                                "message": err
                                            })
                                        } else{
                                            res.status(200).json({
                                                "status": "200",
                                                "message": "successly post"
                                            })
                                        }
                                    } )
                                }
                            }
                        }
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

router.post('/update',upload.fields(type), async function(req,res){
    const message = await token.verify(req,res);
    if(typeof(message) === typeof({})){
        
        console.log(req.body);
        if(req.body.content === undefined || req.body.title === undefined || req.body.post_id === undefined || req.body.count === undefined){
            res.status(200).json({
                "status": "400",
                "message": "something data is missing"
            })
            return 0;
        } else {
            var post = {
                "title" : req.body.title,
                "content" : req.body.content,
                "post_id": req.body.post_id,
                "count": req.body.count
            }
            connection.query(`Select * from ${dbconfig.database}.post where post_id = "${post.post_id}"`, function(err,rows,fields){
                    if(err){
                        res.status(200).json({
                            "status": "400",
                            "message": err
                        })
                    } else {
                        if(rows[0]=== undefined){
                            res.status(200).json({
                                "status": "400",
                                "message": "post do not exist"
                            })
                        }else{
                            connection.query(`Select * from ${dbconfig.database}.group where group_id ="${rows[0].group_id}" and manager="${message.id}"`, function(err,rows,fields){
                                if(err){
                                    res.status(200).json({
                                        "status": "400",
                                        "message": err
                                    })
                                } else {
                                    if(rows[0]===undefined){
                                        res.status(200).json({
                                            "status": "400",
                                            "message": "you are not manager this group"
                                        })
                                    }else{
                                        connection.query(`Update ${dbconfig.database}.post Set title = "${post.title}", content = "${post.content}", count = "${post.count}" where post_id = "${post.post_id}"`,  function(err,rows,fields){
                                            if(err){
                                                res.status(200).json({
                                                    "status": "400",
                                                    "message": err
                                                })
                                            } else {
                                                connection.query(`delete from ${dbconfig.database}.post_images where post_id = "${post.post_id}"`,function(err,rows,fields){
                                                        if(err){
                                                            res.status(200).json({
                                                                "status": "400",
                                                                "message": err
                                                            })
                                                        }else{
                                                            if(req.files !== undefined){
                                                                for(let i=0;i<req.files.image.length;i++){
                                                                    const post_image = {
                                                                        "post_id": post.post_id,
                                                                        "image_path": "/image/"+req.files.image[i].filename,
                                                                    }
                                                                    connection.query(`insert into ${dbconfig.database}.post_images Set ?`,post_image, function(err,rows,fields){
                                                                        if(err){
                                                                            res.status(200).json({
                                                                                "status": "400",
                                                                                "message": err
                                                                            })
                                                                        }
                                                                    })
                                                                }
                                                            }
                                                            res.status(200).json({
                                                                "status": "200",
                                                                "message": "successly edit"
                                                            })
                                                        }
                                                })
                                            }
                                        })         
                                    }
                                }    
                            })
                        }
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

router.get('/detail', async function(req,res){
    const message = await token.verify(req,res);
    if(typeof(message) === typeof({})){
        if(req.query.group_id === undefined){
            connection.query(`Select * from ${dbconfig.database}.post where post_id = "${req.query.post_id}"`, function(err,rows,fields){
                const data = rows[0];
                if(err){
                    res.status(200).json({
                        "status": "400",
                        "message": err
                    })
                } else if(rows[0] === undefined){
                    res.status(200).json({
                        "status": "400",
                        "message": "can not find post"
                    })
                } else {
                    connection.query(`Select * from ${dbconfig.database}.post_images where post_id = "${req.query.post_id}"`, function(err,rows,fields){
                        if(err){
                            res.status(200).json({
                                "status": "400",
                                "message": err
                            })
                        } else {
                            if(rows[0]===undefined)
                                rows[0] = null
                                    res.status(200).json({
                                        "status" : "200",
                                        "message": "successly loaded",
                                        "data": {"post" : {"info": data, "image": rows[0] }}
                                    })
                                }
                    })
                }
            })
        } else if(req.query.post_id === undefined){
            req.query.page_num = req.query.page_num * 1;
            connection.query(`Select * from ${dbconfig.database}.post where group_id = "${req.query.group_id}" order by post_id desc limit ${(req.query.page_num - 1) * 10}, ${req.query.page_num *10 };`, function(err,rows,fields){
                const data = rows;
                if(err){
                    res.status(200).json({
                        "status": "400",
                        "message": err
                    })
                } else if(rows[0] === undefined){
                    res.status(200).json({
                        "status": "400",
                        "message": "can not find post"
                    })
                } else {
                    let image = [];
                    let Response = []
                    for(let i=0; i< data.length; i++){
                        connection.query(`Select * from ${dbconfig.database}.post_images where post_id = "${data[i].post_id}"`, function(err,rows,fields){
                            if(err){
                                res.status(200).json({
                                    "status": "400",
                                    "message": err
                                })
                            } else {
                                if(rows[0] === undefined){
                                    rows[0] = null
                                }
                                Response[i] = {"info":data[i], "image": rows[0] };
                                
                                if(i+1 === data.length){
                                    res.status(200).json({
                                        "status" : "200",
                                        "message": "successly loaded",
                                        "data": {"post": Response, "next_page" : req.query.page_num +1}
                                    })
                                }
                            }
                        })
                    }
                    
                }
            })
        } else {
            res.status(200).json({
                "status": "400",
                "messgae": "query data is wrong"
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
        connection.query(`select * from ${dbconfig.database}.group where manager = "${message.id}"`, function(err,rows,fields){
            if (err){
                res.status(200).json({
                    "status": "400",
                    "messgae": err
                })
            }else {
                if(rows[0] === undefined){
                    res.status(200).json({
                        "status": "400",
                        "message": "you are not manager"
                    })
                }else{
                    connection.query(`delete from ${dbconfig.database}.post where group_id = "${rows[0].group_id}" and post_id = "${req.query.post_id}"`, function(err,rows,fields){
                        if(err){
                            res.status(200).json({
                                "status": "400",
                                "message": err
                            })
                        } else {
                            if(rows.affectedRows){
                                connection.query(`delete from ${dbconfig.database}.post_images where post_id = "${req.query.post_id}"`, function(err,rows,fields){
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
                                  "message": "post do not exist"
                                })
                              }
                        }
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

router.get('/list', async function(req,res){
    const message = await token.verify(req,res);

    if(typeof(message) === typeof({})){
        req.query.page_num = req.query.page_num * 1;
            connection.query(`Select * from ${dbconfig.database}.post order by post_id desc limit ${(req.query.page_num - 1) * 10}, ${req.query.page_num *10 };`, function(err,rows,fields){
                const data = rows;
                if(err){
                    res.status(200).json({
                        "status": "400",
                        "message": err
                    })
                } else if(rows[0] === undefined){
                    res.status(200).json({
                        "status": "200",
                        "message": "success",
                        "data": { "post" : [], "next_page": 0}
                    })
                } else {
                    let Response = [];
                    let image = [];
                    for(let i=0; i< data.length; i++){  
                        connection.query(`Select * from ${dbconfig.database}.post_images where post_id = "${data[i].post_id}"`, function(err,rows,fields){
                            if(err){
                                res.status(200).json({
                                    "status": "400",
                                    "message": err
                                })
                            } else {
                                if(rows[0] === undefined){
                                    rows[0] = null
                                }
                                Response[i] = {"info":data[i], "image": rows[0] };
                                if(i+1 === data.length){
                                    res.status(200).json({
                                        "status" : "200",
                                        "message": "successly loaded",
                                        "data": {"post": Response, "next_page": req.query.page_num+1}
                                    })
                                }
                            }
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

module.exports = router;