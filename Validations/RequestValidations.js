function  Validation(request){
    if(request.body.title == null){
      return ("title is missing");
    }
    if(request.body.description == null){
      return ("description is missing");
    }
    if(request.body.user == null){
      return ("user is missing");
    }
    if(request.body.status == null){
      return ("status is missing");
    }
    return true
  
  }

  module.exports = Validation;
