import supabase from "../supabaseClient.js";
export const sendFriendRequest = async (req, res) => {
    const requester_id = req.session?.userId;
    const { recipient_id } = req.body;
    if (!requester_id) {
        return res.status(401).json({ 
            success: false, 
            message: "Not authenticated. Please login." 
        });
    }
    
    if (!recipient_id) {
        return res.status(400).json({ 
            success: false, 
            message: "Recipient ID required" 
        });
    }    
    if (requester_id === recipient_id) {
        return res.status(400).json({ 
            success: false, 
            message: "Cannot send friend request to yourself" 
        });
    }
    
    try {
        const { data: existing } = await supabase
            .from("friends")
            .select("*")
            .or(
                `and(requester_id.eq.${requester_id},recipient_id.eq.${recipient_id}),and(requester_id.eq.${recipient_id},recipient_id.eq.${requester_id})`,
            )
            .maybeSingle();

        if (existing) {
            let message = "Friend request already exists";
            if (existing.status === 'accepted') {
                message = "You are already friends";
            } else if (existing.status === 'pending') {
                message = "Friend request already pending";
            }
            return res.status(400).json({ 
                success: false, 
                message 
            });
        }
        
        // Insert friend request
        const { data, error } = await supabase
            .from("friends")
            .insert([{ 
                requester_id: requester_id,  // ← From session!
                recipient_id: recipient_id, 
                status: "pending" 
            }])
            .select()
            .single();
            
        if (error) throw error;
        
        res.json({ 
            success: true, 
            message: "Friend request sent", 
            request: data 
        });
        
    } catch (err) {
        console.error("Send friend request error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Database error" 
        });
    }
};

export const getPendingRequests = async (req, res) => {
    const userId = req.session?.userId;
    
    if (!userId) {
        return res.status(401).json({ 
            success: false, 
            message: "Not authenticated. Please login." 
        });
    }
    
    try {
        const { data, error } = await supabase
            .from("friends")
            .select(
                "friendship_id, requester_id, status, users:requester_id(username, email)"
            )
            .eq("recipient_id", userId)
            .eq("status", "pending");
            
        if (error) throw error;
        
        res.json({ 
            success: true, 
            requests: data || [] 
        });
        
    } catch (err) {
        console.error("Get pending requests error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Database error" 
        });
    }
};
export const respondToRequest = async (req, res) => {
    const { friendship_id, status } = req.body;
    const userId = req.session?.userId;  
    
    if (!userId) {
        return res.status(401).json({ 
            success: false, 
            message: "Not authenticated. Please login." 
        });
    }
    
    if (!friendship_id || !["accepted", "rejected"].includes(status)) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid request or status" 
        });
    }
    
    try {
        const { data: request, error: findError } = await supabase
            .from("friends")
            .select("*")
            .eq("friendship_id", friendship_id)
            .eq("recipient_id", userId)  // ← Only recipient can respond
            .eq("status", "pending")
            .single();
        
        if (findError || !request) {
            return res.status(404).json({ 
                success: false, 
                message: "Friend request not found or already processed" 
            });
        }        
        const { data, error } = await supabase
            .from("friends")
            .update({ status })
            .eq("friendship_id", friendship_id)
            .select()
            .single();
            
        if (error) throw error;
        
        res.json({ 
            success: true, 
            message: `Friend request ${status}`, 
            request: data 
        });
        
    } catch (err) {
        console.error("Respond to request error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Database error" 
        });
    }
};
export const getFriendsList = async (req, res) => {
    const userId = req.session?.userId;
    
    if (!userId) {
        return res.status(401).json({ 
            success: false, 
            message: "Not authenticated. Please login." 
        });
    }
    
    try {
        const { data, error } = await supabase
            .from("friends")
            .select(
                `
                friendship_id, status,
                requester:requester_id(id, username, email),
                recipient:recipient_id(id, username, email)
                `
            )
            .or(
                `and(requester_id.eq.${userId},status.eq.accepted),and(recipient_id.eq.${userId},status.eq.accepted)`
            );
            
        if (error) throw error;
        
        const friendsList = data
            .map((f) => {
                if (f.requester.id === userId) return f.recipient;
                if (f.recipient.id === userId) return f.requester;
                return null;
            })
            .filter(Boolean);
        
        res.json({ 
            success: true, 
            friends: friendsList 
        });
        
    } catch (err) {
        console.error("Get friends list error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Database error" 
        });
    }
};
