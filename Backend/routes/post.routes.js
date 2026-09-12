const express = require('express');
const router = express.Router();
const { collection } = require('../configure/db')
const  ObjectId = require('mongodb').ObjectId

// GET all posts
router.get('/', async(req, res) => {
    const allPosts = await collection.find().toArray();
    res.status(200);
    res.send(allPosts);
});

// POST one new post
router.post('/', async(req, res) => {
    
    try {
        const newPost = {
            title: req.body.title,
            location: req.body.location,
            image_id: req.body.image_id 
        }
        const result = await collection.insertOne(newPost);
        res.status(201);
        res.send(result);
    } catch {
        res.status(404);
        res.send({
            error: "Post does not exist!"
        });
    }
});

// GET one post by id
router.get('/:id', async(req, res) => {
    
    try {
        const id_obj = new ObjectId(req.params.id);
        const post = await collection.find( {_id: id_obj } ).toArray();
        console.log('post', req.params.id)
        res.status(202);
        res.send(post);
    } catch {
        res.status(404);
        res.send({
            error: "Post does not exist!"
        });
    }
});

// PATCH (update) one post
router.patch('/:id', async(req, res) => {
    try {
        const id_obj = new ObjectId(req.params.id);
        const post = await collection.findOne({ _id: id_obj })

        if (req.body.title) {
            post.title = req.body.title
        }

        if (req.body.location) {
            post.location = req.body.location
        }

        if (req.body.image_id) {
            post.image_id = req.body.image_id
        }

        await collection.updateOne({ _id: id_obj }, { $set: post });
        res.send(post)
    } catch {
        res.status(404)
        res.send({ error: "Post does not exist!" })
    }
});

// DELETE one post via id
router.delete('/:id', async(req, res) => {
    try {
        const id_obj = new ObjectId(req.params.id);
        const post = await collection.deleteOne({ _id: id_obj })
        console.log('post', post)
        if(post.deletedCount === 1) {
            res.status(204)
            res.send( { message: "deleted" })
        } else {
            res.status(404)
            res.send({ error: "Post does not exist!" })
        }
    } catch {
        res.status(404)
        res.send({ error: "something wrong" })
    }
});

module.exports = router;