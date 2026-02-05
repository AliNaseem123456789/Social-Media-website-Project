export const resolvers = {
  Query: {
    getFeed: async (_, { userId }, { supabase }) => {
      const { data: posts, error } = await supabase
        .from("posts")
        .select("*, users(username)");
      if (error) throw new Error(error.message);
      return posts.map((p) => ({
        ...p,
        username: p.users?.username || "Unknown User",
      }));
    },
  },
  Post: {
    comments: async (parent, _, { supabase }) => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, users(username)")
        .eq("post_id", parent.post_id)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data;
    },
  },
};
