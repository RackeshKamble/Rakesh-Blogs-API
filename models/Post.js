const mongoose = require('mongoose');
const {Schema,model} = mongoose;
const PostSchema = new Schema(
    {
      title: {
        type: String,
        required: true,
      },
      summary: {
        type: String,
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      cover: {
        type: String,
        required: true,
      },
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      tags: {
        type: [String],
        required: true,
      },
    },
    { timestamps: true }
  );
  
  // Add text index on title, summary, and content fields
  PostSchema.index({ title: "text", summary: "text", content: "text" });
  
  module.exports = mongoose.model("Post", PostSchema);