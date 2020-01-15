require('dotenv').config();

var express 			= require("express"),
    mongoose 			= require("mongoose"),
    bodyParser 			= require("body-parser"),
    app 				= express(),
    methodOverride 		= require("method-override"),
    expressSanitizer 	= require("express-sanitizer");
    password            = "ksk1001$";
    flash               = require("connect-flash"),
	nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
 service: 'gmail',
 secure : true,
 auth: {
        user: process.env.email,
        pass: process.env.password
    }
});

// const mailOptions = {
//   from: 'its me', // sender address
//   to: '201701032@daiict.ac.in', // list of receivers
//   subject: 'Subject of your email', // Subject line
//   html: '<h2>You have succesfully registerd on office diary!</h2> <p>Your html here</p>'
// };

// transporter.sendMail(mailOptions, function (err, info) {
//    if(err)
//      console.log(err)
//    else
//      console.log(info);
// });

// APP CONFIG
//app.set("view engine","ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));
app.use(expressSanitizer());
app.use(methodOverride("_method"));
app.use(flash());
app.use(require("express-session")({
    secret:"nothing is impossible!!",
    resave:false,
    saveUninitialized:false
}));
app.use(function(req,res,next){
	res.locals.success = req.flash('success');
	res.locals.error = req.flash('error');
	next();
})

mongoose.connect("mongodb://localhost:27017/node-demo"); 

var taskSchema = new mongoose.Schema({ 
	text:String,
	name:String,
	done:String,
    created:{type:Date,default:Date.now}
});

var Task = mongoose.model("Task",taskSchema);

var userSchema = new mongoose.Schema({
	name:{
    	type: String,
    	lowercase: true
 	},
	email:String,
	tasks : [
		{
			type : mongoose.Schema.Types.ObjectId,
			ref : "Task"
		}
	]
});

var User = mongoose.model("User", userSchema);

app.get("/users",function(req,res){
	User.find({}, function(err,allUser){
		if(err){
			console.log(err);
			req.flash("error","Something went wrong!! Please try again!!");
			res.redirect("/users");
		}
		else {
			res.render("users.ejs",{allUser:allUser})
		}
	})
});

app.post("/users",function(req,res){
	// console.log(req.body.user.email);
	User.findOne({name:req.body.user.name},function(err,copyUser){
		if(err){
			console.log(err);
			req.flash("error","Something went wrong!! Please try again!!");
			res.redirect("/users");
		} 
		if(copyUser){
			req.flash("error","Username already exists!!!");
			res.redirect("/users/new");
		} else {
			User.create(req.body.user, function(err, newCreated){
				if(err){
					console.log(err);
					req.flash("error","Something went wrong!! Please try again!!");
					res.redirect("/users");
				}
				else {
					const mailOptions = {
						from: 'its me', // sender address
						to: req.body.user.email, // list of receivers
						subject: 'Office Work', // Subject line
						html: '<h2>HEY ' + newCreated.name + '!!! You have succesfully registerd on office diary!</h2>'
					};
					transporter.sendMail(mailOptions, function (err, info) {
					   if(err){
					     console.log(err);
						 req.flash("error","Something went wrong!! Please try again!!");
						 res.redirect("/users");
						}
					   else
					     console.log(info);
					});
					req.flash("success","Successfully Created New User!");
					res.redirect("/users");
				}
			})
		}
	})
})

app.get("/users/new",function(req,res){
	res.render("newUser.ejs");
});

app.get("/users/:id",function(req,res){
	User.findById(req.params.id).populate({
	 	path: 'tasks',
	 	model: 'Task',
	 	options: {
	    	sort: {'_id': -1}
		}
	}).exec(function(err,foundUser){
		if(err){
			console.log(err);
			req.flash("error","Something went wrong!! Please try again!!");
			res.redirect("/users");
		} else {
			res.render("show.ejs",{user : foundUser})
		}
	})
})

app.get("/users/:id/task/new",function(req,res){
	User.findById(req.params.id, function(err,foundUser){
		if(err){
			console.log(err);
			req.flash("error","Something went wrong!! Please try again!!");
			res.redirect("/users");
		} else {
			res.render("newTask.ejs",{user:foundUser});
		}
	})
	// res.render("newTask.ejs");
})

app.post("/users/:id/task",function(req,res){
	User.findById(req.params.id,function(err,user){
		if(err){
			console.log(err);
			req.flash("error","Something went wrong!! Please try again!!");
			res.redirect("/users");
		} else {
			var task={text:req.body.task.text, done:"false"};
			Task.create(task,function(err,task){
				if(err){
					console.log(err);
					req.flash("error","Something went wrong!! Please try again!!");
					res.redirect("/users");
				} else {
					console.log(task);
					// task.done="false";
					const mailOptions = {
						from: 'its me', // sender address
					    to: user.email, // list of receivers
					    subject: 'Office Work', // Subject line
					    html: "<h3>HEY " + user.name + "!! You have a new task to complete. Good Luck!!</h3> <h4>" + task.text + "</h4>"
					};

					transporter.sendMail(mailOptions, function (err, info) {
					    if(err){
					    	console.log(err);
						    req.flash("error","Something went wrong!! Please try again!!");
							res.redirect("/users");
						}
					    else
					        console.log(info);
					});
					user.tasks.push(task);
					user.save();
					req.flash("success","Successfully Added New Task!");
					res.redirect('/users/' + user._id);
				}
			})
		}
	})
})

app.get("/users/:id/edit",function(req,res){
	User.findById(req.params.id,function(err,foundUser){
		if(err){
			console.log(err);
			req.flash("error","Something went wrong!! Please try again!!");
			res.redirect("/users");
		} else {
			res.render("editUser.ejs",{user:foundUser});
		}
	})
	// res.send("edit");
})

app.put("/users/:id",function(req,res){
	User.findByIdAndUpdate(req.params.id,req.body.user,function(err,foundUser){
		if(err){
			console.log(err);
			req.flash("error","Something went wrong!! Please try again!!");
			res.redirect("/users");
		} else {
			const mailOptions = {
			  from: 'its me', // sender address
			  to: req.body.user.email, // list of receivers
			  subject: 'Office Work', // Subject line
			  html: '<h2>HEY ' + foundUser.name + 'Successfully updated your user data!!</h2>'
			};
			transporter.sendMail(mailOptions, function (err, info) {
			    if(err){
			    	console.log(err);
			    	req.flash("error","Something went wrong!! Please try again!!");
					res.redirect("/users");
			    } else{
			    	console.log(info);
			    }
			});
			req.flash("success","Successfully Updated!");
			res.redirect("/users/" + req.params.id);
		}
	})
})

app.get("/users/:id/delete",function(req,res){
	User.findById(req.params.id,function(err,foundUser){
		if(err){
			console.log(err);
			req.flash("error","Something went wrong!! Please try again!!");
			res.redirect("/users");
		} else {
			res.render("deleteUser.ejs",{user:foundUser});
		}
	})
})

app.delete("/users/:id",function(req,res){
	if(req.body.password === password){
		User.findByIdAndRemove(req.params.id,function(err){
			if(err){
				console.log(err);
				req.flash("error","Something went wrong!! Please try again!!");
				res.redirect("/users");
			} else {
				req.flash("error","User Deleted!");
				res.redirect("/users");
			}
		})
	}
	else{
		req.flash("error","Wrong Password. Please Try Again!")
		res.redirect("/users/" + req.params.id + "/delete")
	}
})

app.get("/users/:id/task/:task_id/edit",function(req,res){
	Task.findById(req.params.task_id,function(err,foundTask){
		if(err){
			console.log(err);
			req.flash("error","Something went wrong!! Please try again!!");
			res.redirect("/users");
		} else {
			res.render("editTask.ejs",{user_id:req.params.id, task:foundTask});
		}
	})
})

app.put("/users/:id/task/:task_id",function(req,res){
	var oldTask;
	Task.findById(req.params.task_id,function(err,task){
		oldTask = task.text;
	})
	Task.findByIdAndUpdate(req.params.task_id,req.body.task,function(err,foundTask){
		if(err){
			console.log(err);
			req.flash("error","Something went wrong!! Please try again!!");
			res.redirect("/users");
		} else {
			User.findById(req.params.id,function(err,user){
				const mailOptions = {
					from: 'its me', // sender address
				  	to: user.email, // list of receivers
				  	subject: 'Office Work', // Subject line
				  	html: '<h3>HEY ' + user.name + 'Your old task has been updated.</h3><hr><hr> <h4> Previous Task - </h4>'
				  	 + oldTask + 
				  	 '<hr><hr><h4>Updated Task - </h4>' + req.body.task.text				
				};
				transporter.sendMail(mailOptions, function (err, info) {
			   		if(err){
			     		console.log(err);
			     		req.flash("error","Something went wrong!! Please try again!!");
						res.redirect("/users");
			   		}
			   		else
				    	console.log(info);
				});
				req.flash("success","Successfully Updated!");
				res.redirect("/users/" + req.params.id);
			})
		}
	})
})

app.delete("/users/:id/task/:task_id",function(req,res){
	Task.findByIdAndRemove(req.params.task_id,function(err){
		if(err){
			console.log(err);
			req.flash("error","Something went wrong!! Please try again!!");
			res.redirect("/users");
		} else {
			req.flash("error","Task Deletd!");
			res.redirect("/users/" + req.params.id);	
		}
	})
})

app.get("/users/:id/:task_id/done",function(req,res){
	var name;
	var text;
	var task_id=req.params.task_id;
	Task.findById(req.params.task_id,function(err,foundTask){
		text=foundTask.text;
	})
	User.find({},function(err,foundUser){
		if(err){
			console.log(err);
			req.flash("error","Something went wrong!! Please try again!!");
			res.redirect("/users");
		} else {
			res.render("done.ejs",{user:foundUser, text:text, task_id:task_id, user_id:req.params.id});
		}
	})
	// res.render("done.ejs");
	// res.send("this is done route");
})

app.post("/users/:user_id/:id/:task_id",function(req,res){
	// console.log(req.body.task);
	// var id = req.params.task_id;
	// var line = document.querySelector("#id");
	// console.log(line);
	var name;
	var text;
	User.findById(req.params.user_id,function(err,foundUser){
		if(err){
			console.log(err);
			req.flash("error","Something went wrong!! Please try again!!");
			res.redirect("/users");
		} else {
			name = foundUser.name;
		}
	})
	Task.findById(req.params.task_id,function(err,task){
		if(err){
			console.log(err);
			req.flash("error","Something went wrong!! Please try again!!");
			res.redirect("/users");
		} else {
			// task.text = "aaj me kar ke aaya";
			text = task.text;
			// task.done="true";
			// console.log(task);
		}
	})
	Task.findByIdAndUpdate(req.params.task_id,{done:"true"},function(err,task){
		if(err){
			console.log(err);
			req.flash("error","Something went wrong!! Please try again!!");
			res.redirect("/users");
		} else {
			console.log(task);
		}
	})
	User.findById(req.params.id,function(err,user){
		if(err){
			coneole.log(err);
			req.flash("error","Something went wrong!! Please try again!!");
			res.redirect("/users");
		} else {
			var newTask = {text:text, name:name, done:"false"};
			Task.create(newTask,function(err,task){
				console.log(task);
				if(err){
					console.log(err);
					req.flash("error","Something went wrong!! Please try again!!");
					res.redirect("/users");
				} else {
					const mailOptions = {
						from: 'its me', // sender address
					    to: user.email, // list of receivers
					    subject: 'Office Work', // Subject line
					    html: "<h3>Hey " + user.name + "!!!</h3><h3>" + name + " has forwarded a task to you. Check it out. Good Luck!!</h3> <h4> " + task.text + "</h4>"
					};

					transporter.sendMail(mailOptions, function (err, info) {
					    if(err){
					    	console.log(err);
					    	req.flash("error","Something went wrong!! Please try again!!");
							res.redirect("/users");
					    }
					    else
					        console.log(info);
					});
					user.tasks.push(task);
					user.save();
					req.flash("success","Successfully Forwarded a Task!");
					res.redirect('/users/' + user._id);
				}
			})
		}
	})
})

app.get("/users/:id/:task_id/skip",function(req,res){
	Task.findByIdAndUpdate(req.params.task_id,{done:"true"},function(err,task){
		if(err){
			console.log(err);
			req.flash("error","Something went wrong!! Please try again!!");
			res.redirect("/users");
		} else {
			console.log(task);
			res.redirect("/users/" + req.params.id);
		}
	})
})

app.listen(3000,function(){
	console.log("server is running.............................");
})