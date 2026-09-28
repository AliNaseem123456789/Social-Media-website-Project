import { Router } from "express";
import { validate } from "#core/http/validate.js";
import { requireAuth } from "#core/http/authenticate.js";
import { postImages } from "#core/http/upload.js";
import { postsController as c } from "./posts.controller.js";
import {
  postIdParams,
  commentParams,
  draftParams,
  listPostsQuery,
  likedPostsQuery,
  savedPostsQuery,
  trendingTagsQuery,
  createPostSchema,
  updatePostSchema,
  repostSchema,
  listCommentsQuery,
  createCommentSchema,
  updateCommentSchema,
  createDraftSchema,
  updateDraftSchema,
} from "./posts.schemas.js";

const router = Router();
const images = postImages();
const byId = validate({ params: postIdParams });
const byComment = validate({ params: commentParams });
const byDraft = validate({ params: draftParams });

router.use(requireAuth);

router.get("/", validate({ query: listPostsQuery }), c.list);
router.post("/", images, validate({ body: createPostSchema }), c.create);
router.get("/liked", validate({ query: likedPostsQuery }), c.listLiked);
router.get("/saved", validate({ query: savedPostsQuery }), c.listSaved);
router.get("/hashtags/trending", validate({ query: trendingTagsQuery }), c.trendingHashtags);

router.get("/drafts", c.listDrafts);
router.post("/drafts", images, validate({ body: createDraftSchema }), c.createDraft);
router.patch("/drafts/:draftId", images, validate({ params: draftParams, body: updateDraftSchema }), c.updateDraft);
router.delete("/drafts/:draftId", byDraft, c.deleteDraft);
router.post("/drafts/:draftId/publish", byDraft, c.publishDraft);

router.get("/:id", byId, c.get);
router.patch("/:id", images, validate({ params: postIdParams, body: updatePostSchema }), c.update);
router.delete("/:id", byId, c.remove);

router.put("/:id/pin", byId, c.pin);
router.delete("/:id/pin", byId, c.unpin);

router.put("/:id/like", byId, c.like);
router.delete("/:id/like", byId, c.unlike);

router.put("/:id/save", byId, c.save);
router.delete("/:id/save", byId, c.unsave);

router.post("/:id/repost", validate({ params: postIdParams, body: repostSchema }), c.repost);
router.delete("/:id/repost", byId, c.removeRepost);

router.get("/:id/comments", validate({ params: postIdParams, query: listCommentsQuery }), c.listComments);
router.post("/:id/comments", validate({ params: postIdParams, body: createCommentSchema }), c.addComment);
router.patch("/:id/comments/:commentId", validate({ params: commentParams, body: updateCommentSchema }), c.updateComment);
router.delete("/:id/comments/:commentId", byComment, c.deleteComment);
router.put("/:id/comments/:commentId/like", byComment, c.likeComment);
router.delete("/:id/comments/:commentId/like", byComment, c.unlikeComment);

export default router;
