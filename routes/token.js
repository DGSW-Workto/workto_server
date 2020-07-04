var jwt = require('jsonwebtoken');
var config = require('../config/config');

var token = {};

token.verify = async function(req,res,next){
  return new Promise(function(res,rej){
    const token = req.headers['x-access-token'] || req.query.token;  // client에게서 받은 토큰
    if(!token){
        res('not logged in');
      } 
      /* 토큰 유효성 검사 */
      const p = new Promise((resolve, reject) => {
        jwt.verify(token, config.secret, (err,decoded) => {
          if(err) reject(err);
          else resolve(decoded);
        })
      });
      /* 유효하지 않은 토큰으로 403 에러 처리 */
      const onError = (error) => {
          res(error.message);
      };
    
      p.then((decoded)=>{
        res(decoded);
      }).catch(onError);
  })
  /* 토큰이 없으면 403 에러 응답 처리 */
  
}

module.exports = token;