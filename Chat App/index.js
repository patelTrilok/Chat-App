//

var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
let cookieParser = require("cookie-parser");

let chatLog = []; //History of all the messages sent on the server so far

let users = []; //List of users who have connected to the server (not all of them could be online)

let online_users = []; //List of users who are currently online

app.use(cookieParser());

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
	
});

//Socket connection listener
io.on('connection', function(socket){
	console.log('a user connected');
	
	let username = "";
	let usercolor = "";
	
	socket.emit('client connect');
	
	socket.on('saved cookie', function(nickname, nickcolor){
		console.log("EXISTING USER " + nickname + " " + nickcolor);
		username = nickname;
		usercolor = nickcolor;
		users.push(username);
		online_users.push(username);
		io.emit('online users', online_users);
		socket.emit('username');
		socket.emit('alert', "You are " + username);
		console.log(users);
	});
	
	socket.on('new user', function(){
		username = getUserName();
		usercolor = getUserColor();
		users.push(username);
		online_users.push(username);
		socket.emit('nick', username, usercolor);
		console.log("A NEW USER " + username + " " + usercolor);
		socket.emit('alert', "You are " + username);
		socket.emit('username');
		io.emit('online users', online_users);
	});
	
	socket.emit('msg history', chatLog);
	
	//Socket disconnection listener
	socket.on('disconnect', function(){
		console.log('user disconnected');
		for(let i = 0; i < online_users.length; i++){
			if(username === online_users[i]){
				online_users.splice(i,1);
			}
		}	
		//Emit an event to update the online users list for all users
		io.emit('online users', online_users);
	});
  
	//Listener for 'chat message' event
	socket.on('chat message', function(msg){
		//Start by checking if client sent a message or a command to change nickname or nickcolor
		if(msg.startsWith('/')){
			msg = msg.substring(1);
			if(msg.startsWith('nick ')){
				//Check if message is command for changing nickname
				let oldnick = username;
				let newnick = msg.split(" ")[1];
				if(oldnick === newnick){
					socket.emit('alert', "This is your name already!");	
				}
				else if(users.includes(newnick) || online_users.includes(newnick)){
					socket.emit('alert', "Sorry this nickname is taken, pick a new one!");	
				}
				else if(newnick.length === 0 || newnick==undefined){
					socket.emit('alert', "Please specify a nickname to change!");	
				}
				else{
					username = newnick;
					for(let i = 0; i < users.length; i++){
						if(oldnick === users[i]){
							users.splice(i,1);
						}
					}	
					
					for(let i = 0; i < online_users.length; i++){
						if(oldnick === online_users[i]){
							online_users.splice(i,1);
						}
					}
					online_users.push(username);
					users.push(username);
//					console.log("USER LIST: " + users);
//					console.log("ONLINE USERS: " + online_users);
					socket.emit('nick', username, usercolor);
					socket.emit('alert', "Nickname successfully changed to " + username);
					socket.emit('username');
					io.emit('online users', online_users);
	
				}
				
			}
			//Check if message is command for changing nickcolor 
			else if(msg.startsWith('nickcolor ')){
				let oldcolor = usercolor;
				let newcolor = msg.split(" ")[1];
				if(newcolor.length < 6 || newcolor.length > 6){
					socket.emit('alert', "Usage: /nickcolor RRGGBB");
				}
				else{
					usercolor = "#" + newcolor;
					socket.emit('nick', username, usercolor);
					socket.emit('alert', "Nickcolor successfully changed to " + usercolor);
					socket.emit('username');
					io.emit('online users', online_users);
				}
			}
			else{
				socket.emit('alert', "Allowed Commands are: /nick (new nickname) or /nickcolor RRGGBB");
			}
			
		}
		else{
			//When a user types a message to send
			let time = new Date();
			msg = msg.trim();
			if(msg.length > 0){
				let message = {content: msg, msgtime:time, sendername:username};
				chatLog.push(message); //Check whether it should be append
				message.msgcolor = usercolor;
				io.emit('chat message', message); //Broadcast the message to other socket connections
			}

		}
	});
  
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

//Generate a new nickname when new client connects to the server
//Will generate user name as User<a> where <a> is an arbitrary number
function getUserName(){
	let counter = 1;
	let username = "User" + counter;
	
	while(users.includes(username)){
		counter++;
		username = "User" + counter;
	}
	//console.log(username);
	return username;
}

//Code from https://stackoverflow.com/questions/1484506/random-color-generator
function getUserColor(){
	let letters = '0123456789ABCDEF';
	let color = '#';
	for (var i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}
