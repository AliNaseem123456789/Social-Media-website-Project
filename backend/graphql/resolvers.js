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
        const profileImage = p.users?.user_profiles?.profile_image;
        let avatarUrl = null;
        if (profileImage) {
          if (profileImage.startsWith("http")) {
            avatarUrl = profileImage;
          } else {
            avatarUrl = `https://cdxeqrhdascyezirccrm.supabase.co/storage/v1/object/public/avatars/${profileImage}`;
          }
        }
        let fullImageUrl = null;
        if (p.image_url) {
          console.log('Image URL exists:', p.image_url);
          if (p.image_url.startsWith("http")) {
            fullImageUrl = p.image_url;
            console.log('Already full URL:', fullImageUrl);
          } else {
            fullImageUrl = `https://cdxeqrhdascyezirccrm.supabase.co/storage/v1/object/public/post-images/${p.image_url}`;
            console.log('Constructed URL:', fullImageUrl);
          }
        } else {
          console.log('No image_url for this post');
        }

        return {
          post_id: p.post_id,
          user_id: p.user_id,
          content: p.content,
          image_url: fullImageUrl,
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