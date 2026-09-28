import { ok, created, noContent } from "#core/http/respond.js";
import { collectImages } from "#core/http/upload.js";
import { postsService } from "./posts.service.js";

const params = (req) => req.validated.params;
const query = (req) => req.validated.query;

export const postsController = {
  async list(req, res) {
    ok(res, await postsService.list(query(req), req.user.id));
  },

  async listLiked(req, res) {
    ok(res, await postsService.listLiked(req.user.id, query(req)));
  },

  async listSaved(req, res) {
    ok(res, await postsService.listSaved(req.user.id, query(req)));
  },

  async trendingHashtags(req, res) {
    ok(res, { items: await postsService.trendingHashtags(query(req)) });
  },

  async get(req, res) {
    ok(res, await postsService.get(params(req).id, req.user.id));
  },

  async create(req, res) {
    created(res, await postsService.create(req.user, req.body, collectImages(req)));
  },

  async update(req, res) {
    ok(res, await postsService.update(req.user, params(req).id, req.body, collectImages(req)));
  },

  async remove(req, res) {
    await postsService.remove(req.user, params(req).id);
    noContent(res);
  },

  async pin(req, res) {
    ok(res, await postsService.setPinned(req.user, params(req).id, true));
  },

  async unpin(req, res) {
    ok(res, await postsService.setPinned(req.user, params(req).id, false));
  },

  async like(req, res) {
    ok(res, await postsService.like(req.user, params(req).id));
  },

  async unlike(req, res) {
    ok(res, await postsService.unlike(req.user, params(req).id));
  },

  async save(req, res) {
    ok(res, await postsService.save(req.user, params(req).id));
  },

  async unsave(req, res) {
    ok(res, await postsService.unsave(req.user, params(req).id));
  },

  async repost(req, res) {
    created(res, await postsService.repost(req.user, params(req).id, req.body));
  },

  async removeRepost(req, res) {
    ok(res, await postsService.removeRepost(req.user, params(req).id));
  },

  async listComments(req, res) {
    ok(res, await postsService.listComments(params(req).id, query(req), req.user.id));
  },

  async addComment(req, res) {
    created(res, await postsService.addComment(req.user, params(req).id, req.body));
  },

  async updateComment(req, res) {
    ok(res, await postsService.updateComment(req.user, params(req).id, params(req).commentId, req.body));
  },

  async deleteComment(req, res) {
    await postsService.deleteComment(req.user, params(req).id, params(req).commentId);
    noContent(res);
  },

  async likeComment(req, res) {
    ok(res, await postsService.likeComment(req.user, params(req).id, params(req).commentId));
  },

  async unlikeComment(req, res) {
    ok(res, await postsService.unlikeComment(req.user, params(req).id, params(req).commentId));
  },

  async listDrafts(req, res) {
    ok(res, await postsService.listDrafts(req.user.id));
  },

  async createDraft(req, res) {
    created(res, await postsService.createDraft(req.user, req.body, collectImages(req)));
  },

  async updateDraft(req, res) {
    ok(res, await postsService.updateDraft(req.user, params(req).draftId, req.body, collectImages(req)));
  },

  async deleteDraft(req, res) {
    await postsService.deleteDraft(req.user, params(req).draftId);
    noContent(res);
  },

  async publishDraft(req, res) {
    created(res, await postsService.publishDraft(req.user, params(req).draftId));
  },
};
