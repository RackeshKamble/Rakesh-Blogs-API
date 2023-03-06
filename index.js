const express = require('express');

//Avoid Fetch Errors on CORS
const cors = require('cors');
const path = require('path');

const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
//const User = require('./models/User');
const { UserModel } = require('./models/User');
const Post = require('./models/Post');

// Password encrypted
const bcrypt = require('bcryptjs');


const app = express();

//JWT
const jwt = require('jsonwebtoken');
// Cookie Parser
const cookieParser = require('cookie-parser');

//Middleware for handling form e.g. used for uploading files in upload directory
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });

//File system read attachments on post
const fs = require('fs');


//Password bcrypt SALT
const salt = bcrypt.genSaltSync(10);
// Secret
const secret = 'qwertyuiop';

//Handle CORS errors
//app.use(cors({credentials:true,origin:'http://localhost:3000'}));

//deployment

//app.use(express.static(path.join(__dirname , './client/build')));

app.use(cors({origin:'http://localhost:3000' , credentials:true}))
/*
 app.use((_req, res) => {
     res.header('Access-Control-Allow-Origin', '*');
     res.header('Access-Control-Allow-Headers', '*');  
    
   });
*/
// Use Middleware and parse JSON
app.use(express.json());

// Middleware for cookie parser used in Profile
app.use(cookieParser());

// Force images to be in uploads dir
app.use('/uploads', express.static(__dirname + '/uploads'));

//Deployment 
// app.use('*' , function(req,res){
//     res.sendFile(path.join(__dirname, './client/build/index.html'));
// })
app.get('/' ,(req,res) => {
    //res.setHeader('Access-Control-Allow-Credentials' , 'true');
    res.header('Access-Control-Allow-Origin', '*');
    res.send("API is running");
});
//Connect mongoose
//mongoose.connect('mongodb+srv://rackeshkamble:Co10O4i3fJrwPU8n@cluster0.egsr5zu.mongodb.net/?retryWrites=true&w=majority');
//mongoose.connect('mongodb+srv://RakeshKamble:Mhasoba_10@rakesh-kamble-blogs.ygkq5sg.mongodb.net/?retryWrites=true&w=majority')
//mongodb+srv://rackeshkamble:<password>@cluster0.6v3bv6g.mongodb.net/?retryWrites=true&w=majority
mongoose.connect('mongodb+srv://rackeshkamble:CcMuvfuttxm3grDM@cluster0.6v3bv6g.mongodb.net/?retryWrites=true&w=majority')
app.post('/register' , async (req, res) =>{
    
    const {username,password} = req.body;
    //Register Users
    try{
        const userDoc = await User.create(
            {
                username, 
                password:bcrypt.hashSync(password,salt),
            });
        res.json(userDoc); 
    }
    catch(e){
        console.log(e);
        res.status(400).json(e);
    }  
});

app.post('/login' , async (req, res)=>{
    // Get username and password
    const {username,password} = req.body;
    // Check if username & password are correct, see docs
    // https://yarnpkg.com/package/bcryptjs
    //const userDoc = await User.findOne({username});
    const userDoc = await UserModel.findOne({username});

    const passOk = bcrypt.compareSync(password, userDoc.password);
  
    //res.json(passOk);

    if(passOk)
    {
        // User Logged in respond with Json Web Token
        jwt.sign(
            {
                username, 
                id : userDoc._id
            },
            secret , 
            {},
            (err ,token) => {
                // Throw error
                if(err)
                throw err;
                // Else respond token with JSON as cookie
                res.cookie('token', token).json(
                    {
                        id:userDoc._id,
                        username,
                    }
                    );                 
            });        
    }
    
    else
    {
        // Login Failed
        res.status(400).json("Wrong Password")
    }
});

app.get('/profile', (req,res) => {
    const {token} = req.cookies;
    //const { token } = req.cookies['token'];
    jwt.verify(token, secret, {}, (err,info) => {
        
        // Throw error
        if (err) throw err;
        
        // Send info
        // Network - Profile - Check preview for Info
        res.json(info);
        
    });
});

app.post('/logout', (req,res) => {
    // Send empty string as token
    res.cookie('token', '').json('ok');
});

app.post('/post' , uploadMiddleware.single('file') , async (req,res) =>{
    
    // Change fiile name before uploading i.e. remove webp extension
    // Found on post -> preview
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];

    const newPath = path+'.'+ext;
    
    fs.renameSync(path, newPath);

    const {token} = req.cookies;
    //const { token } = req.cookies['token'];
    jwt.verify(token, secret, {}, async (err,info) => {
        
        // Throw error
        if (err) throw err;
        
        const {title,summary,content,tags} = req.body;
    
        const postDoc = await Post.create({
            title,
            summary,
            content,
            cover:newPath,
            // GTrab from JWT info
            author:info.id,
            tags,
        });
        
        // Send info
        // Network - Profile - Check preview for Info
        res.json(postDoc);
        
    });
});

// For Edit Post
app.put('/post' , uploadMiddleware.single('file') , async(req,res) => {
    let newPath = null;
    
    if(req.file) 
    {
        const {originalname,path} = req.file;
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        newPath = path+'.'+ext;
        fs.renameSync(path, newPath);
    }

    const {token} = req.cookies;
    //const { token } = req.cookies['token'];
    jwt.verify(token, secret, {}, async (err,info) => {
        
        // Throw error
        if (err) throw err;
        
        const {id,title,summary,content ,tags} = req.body;
    
        const postDoc = await Post.findById(id);
        
        const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);

        if (!isAuthor) 
        {
            return res.status(400).json('You are not the owner of this post');
        }

        await postDoc.update({
            title,
            summary,
            content,
            cover: newPath ? newPath : postDoc.cover,
            tags,
        });

        res.json(postDoc);  

    });
});

//Sort Post by Author and limit as 20
app.get('/post', async (req,res) => {
    //sort by author  
    //sort by descending order max limit 20
    res.json
    (
      await Post.find()
        .populate('author', ['username'])
        .sort({createdAt: -1}) 
        .limit(20)
    );
  });
  
app.get('/post/:id' , async(req,res) =>{
    const {id} = req.params;
    const postDoc = await Post.findById(id).populate('author' , ['username']);
    res.json(postDoc);
});

//searching
// Search posts
app.get('/search', async (req, res) => {
    const { q } = req.query;
  
    try {
      const posts = await Post.find({ $text: { $search: q } });
      res.json(posts);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  });
  

app.listen(4000);
