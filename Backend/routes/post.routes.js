const express = require('express');
const router = express.Router();
const { collection } = require('../configure/db')

// GET all posts
router.get('/', async(req, res) => {
    const allPosts = await collection.find().toArray();
    res.status(200);
    res.send(allPosts);
});

module.exports = router;

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
