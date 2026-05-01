export const resolvers = {
  Query: {
    getFeed: async (_, { userId }, { supabase }) => {
      const { data: posts, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          users:user_id (
            username,
            user_profiles ( profile_image )
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      return posts.map((p) => {
        // Get the profile image filename
        const profileImage = p.users?.user_profiles?.profile_image;

        // Construct full URL (adjust based on your storage setup)
        let avatarUrl = null;
        if (profileImage) {
          // If it's already a full URL, use it
          if (profileImage.startsWith("http")) {
            avatarUrl = profileImage;
          } else {
            // Otherwise, construct the full URL
            avatarUrl = `https://cdxeqrhdascyezirccrm.supabase.co/storage/v1/object/public/avatars/${profileImage}`;
          }
        }

        return {
          post_id: p.post_id,
          user_id: p.user_id,
          content: p.content,
          image_url: p.image_url,
          total_likes: p.total_likes || 0,
          created_at: p.created_at,
          username: p.users?.username || "Unknown User",
          avatar_url: avatarUrl,
          comments: [],
        };
      });
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
