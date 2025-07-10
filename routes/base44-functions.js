const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const scrapeCreators = require('../services/scrapeCreators');

// Function to validate required fields
function validateRequiredFields(obj, fields) {
    for (const field of fields) {
        if (obj[field] === undefined || obj[field] === null) {
            return `Missing required field: ${field}`;
        }
    }
    return null;
}

// Base44 Authentication
router.post('/authenticate', async (req, res) => {
    try {
        const { api_key } = req.body;
        
        if (!api_key) {
            return res.status(400).json({ error: 'API key is required' });
        }
        
        // Check if API key exists in database
        const { data, error } = await supabase
            .from('api_keys')
            .select('*')
            .eq('key', api_key)
            .single();
            
        if (error || !data) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        
        // Check if API key is active
        if (!data.is_active) {
            return res.status(401).json({ error: 'API key is inactive' });
        }
        
        // Generate a session token
        const sessionToken = Math.random().toString(36).substring(2, 15) + 
                            Math.random().toString(36).substring(2, 15);
        
        // Store session token
        const { error: sessionError } = await supabase
            .from('api_sessions')
            .insert({
                api_key_id: data.id,
                token: sessionToken,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
            });
            
        if (sessionError) {
            return res.status(500).json({ error: 'Failed to create session' });
        }
        
        res.json({
            success: true,
            token: sessionToken,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
    } catch (error) {
        console.error('Error in authenticate:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            function: 'authenticate'
        });
    }
});

// Music Catalog
router.post('/music-catalog', async (req, res) => {
    try {
        const { action, trackData } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        switch (action) {
            case 'add_track':
                // Validate required fields
                const validationError = validateRequiredFields(trackData, ['title', 'artist', 'genre']);
                if (validationError) {
                    return res.status(400).json({ error: validationError });
                }
                
                // Add track to catalog
                const { data: track, error } = await supabase
                    .from('tracks')
                    .insert({
                        user_id: userId,
                        title: trackData.title,
                        artist: trackData.artist,
                        genre: trackData.genre,
                        release_date: trackData.releaseDate || new Date().toISOString(),
                        isrc: trackData.isrc || null,
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single();
                    
                if (error) throw error;
                
                res.json({
                    success: true,
                    data: track
                });
                break;
                
            case 'get_catalog':
                // Get user's music catalog
                const { data: catalog, error: catalogError } = await supabase
                    .from('tracks')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false });
                    
                if (catalogError) throw catalogError;
                
                res.json({
                    success: true,
                    data: catalog
                });
                break;
                
            default:
                res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Error in music-catalog:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            function: 'music-catalog'
        });
    }
});

// Royalty Distribution
router.post('/royalty-distribution', async (req, res) => {
    try {
        const { trackId, collaborators } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Validate track ownership
        const { data: track, error: trackError } = await supabase
            .from('tracks')
            .select('*')
            .eq('id', trackId)
            .eq('user_id', userId)
            .single();
            
        if (trackError || !track) {
            return res.status(403).json({ error: 'Track not found or not owned by user' });
        }
        
        // Validate collaborators
        if (!Array.isArray(collaborators)) {
            return res.status(400).json({ error: 'Collaborators must be an array' });
        }
        
        // Validate total percentage
        const totalPercentage = collaborators.reduce((sum, collab) => sum + (collab.percentage || 0), 0);
        if (totalPercentage > 100) {
            return res.status(400).json({ error: 'Total percentage cannot exceed 100%' });
        }
        
        // Store collaborators
        const collaboratorRecords = collaborators.map(collab => ({
            track_id: trackId,
            name: collab.name,
            email: collab.email,
            role: collab.role,
            percentage: collab.percentage,
            created_at: new Date().toISOString()
        }));
        
        const { error: collabError } = await supabase
            .from('track_collaborators')
            .insert(collaboratorRecords);
            
        if (collabError) throw collabError;
        
        res.json({
            success: true,
            data: {
                trackId,
                collaborators: collaboratorRecords,
                ownerPercentage: 100 - totalPercentage
            }
        });
    } catch (error) {
        console.error('Error in royalty-distribution:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            function: 'royalty-distribution'
        });
    }
});

// Release Planning
router.post('/release-planning', async (req, res) => {
    try {
        const { trackId, releaseData } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Validate track ownership
        const { data: track, error: trackError } = await supabase
            .from('tracks')
            .select('*')
            .eq('id', trackId)
            .eq('user_id', userId)
            .single();
            
        if (trackError || !track) {
            return res.status(403).json({ error: 'Track not found or not owned by user' });
        }
        
        // Create release plan
        const { data: releasePlan, error } = await supabase
            .from('release_plans')
            .insert({
                track_id: trackId,
                release_date: releaseData.releaseDate,
                distribution_platforms: releaseData.platforms,
                marketing_plan: releaseData.marketingPlan,
                budget: releaseData.budget,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
            
        if (error) throw error;
        
        // Generate timeline
        const releaseDate = new Date(releaseData.releaseDate);
        const timeline = [
            {
                date: new Date(releaseDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                action: 'Submit to distributors'
            },
            {
                date: new Date(releaseDate.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                action: 'Begin social media promotion'
            },
            {
                date: new Date(releaseDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                action: 'Send to playlist curators'
            },
            {
                date: releaseData.releaseDate,
                action: 'Release day promotion'
            },
            {
                date: new Date(releaseDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                action: 'Post-release analytics review'
            }
        ];
        
        res.json({
            success: true,
            data: {
                releasePlan,
                timeline
            }
        });
    } catch (error) {
        console.error('Error in release-planning:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            function: 'release-planning'
        });
    }
});

// Analytics Engine
router.post('/analytics-engine', async (req, res) => {
    try {
        const { trackId, timeframe } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Generate mock analytics data
        const analyticsResult = {
            trackId,
            timeframe,
            streams: {
                spotify: Math.floor(Math.random() * 10000),
                appleMusic: Math.floor(Math.random() * 5000),
                youtubeMusic: Math.floor(Math.random() * 3000),
                total: 0
            },
            revenue: {
                spotify: 0,
                appleMusic: 0,
                youtubeMusic: 0,
                total: 0
            },
            demographics: {
                age: {
                    '18-24': Math.floor(Math.random() * 40) + 10,
                    '25-34': Math.floor(Math.random() * 40) + 10,
                    '35-44': Math.floor(Math.random() * 20) + 5,
                    '45+': Math.floor(Math.random() * 10) + 5
                },
                gender: {
                    male: Math.floor(Math.random() * 60) + 20,
                    female: 0,
                    other: Math.floor(Math.random() * 10)
                },
                countries: {
                    US: Math.floor(Math.random() * 50) + 20,
                    UK: Math.floor(Math.random() * 20) + 5,
                    DE: Math.floor(Math.random() * 15) + 5,
                    FR: Math.floor(Math.random() * 10) + 5,
                    other: 0
                }
            },
            growth: {
                weekOverWeek: (Math.random() * 20 - 5).toFixed(2),
                monthOverMonth: (Math.random() * 40 - 10).toFixed(2)
            }
        };
        
        // Calculate totals
        analyticsResult.streams.total = 
            analyticsResult.streams.spotify + 
            analyticsResult.streams.appleMusic + 
            analyticsResult.streams.youtubeMusic;
            
        analyticsResult.revenue.spotify = (analyticsResult.streams.spotify * 0.004).toFixed(2);
        analyticsResult.revenue.appleMusic = (analyticsResult.streams.appleMusic * 0.006).toFixed(2);
        analyticsResult.revenue.youtubeMusic = (analyticsResult.streams.youtubeMusic * 0.003).toFixed(2);
        analyticsResult.revenue.total = (
            parseFloat(analyticsResult.revenue.spotify) +
            parseFloat(analyticsResult.revenue.appleMusic) +
            parseFloat(analyticsResult.revenue.youtubeMusic)
        ).toFixed(2);
        
        analyticsResult.demographics.gender.female = 
            100 - analyticsResult.demographics.gender.male - analyticsResult.demographics.gender.other;
            
        analyticsResult.demographics.countries.other = 
            100 - analyticsResult.demographics.countries.US - 
            analyticsResult.demographics.countries.UK - 
            analyticsResult.demographics.countries.DE - 
            analyticsResult.demographics.countries.FR;

        res.json({
            success: true,
            data: analyticsResult
        });
    } catch (error) {
        console.error('Error in analytics-engine:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            function: 'analytics-engine'
        });
    }
});

// Promotion Engine
router.post('/promotion-engine', async (req, res) => {
    try {
        const { campaignData } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Create promotion campaign
        const { data: campaign, error } = await supabase
            .from('promotions')
            .insert({
                user_id: userId,
                type: campaignData.type,
                title: campaignData.title,
                description: campaignData.description,
                target_audience: campaignData.targetAudience,
                budget: campaignData.budget,
                status: 'active',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: {
                campaignId: campaign.id,
                status: 'active',
                estimatedReach: 5000,
                estimatedCost: campaignData.budget * 0.1
            }
        });
    } catch (error) {
        console.error('Error in promotion-engine:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            function: 'promotion-engine'
        });
    }
});

// Public Campaign
router.post('/public-campaign', async (req, res) => {
    try {
        const { action, promotionId, email, name } = req.body;

        switch (action) {
            case 'collect_fan':
                // Store fan data
                const { error } = await supabase
                    .from('campaign_fans')
                    .insert({
                        promotion_id: promotionId,
                        email,
                        name,
                        created_at: new Date().toISOString()
                    });
                
                if (error) throw error;
                
                res.json({
                    success: true,
                    data: { message: 'Fan data collected successfully' }
                });
                break;
            default:
                res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Error in public-campaign:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            function: 'public-campaign'
        });
    }
});

// YouTube Ideas
router.post('/youtube-ideas', async (req, res) => {
    try {
        const { topic } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Generate YouTube content ideas
        const ideas = [
            `Behind the scenes: Making of "${topic}"`,
            `Studio session: Recording "${topic}"`,
            `Reaction video: Fans listening to "${topic}"`,
            `Tutorial: How I created "${topic}"`,
            `Collaboration: Working with other artists on "${topic}"`
        ];

        res.json({
            success: true,
            data: {
                topic,
                ideas,
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error in youtube-ideas:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            function: 'youtube-ideas'
        });
    }
});

// Publishing Services
router.post('/publishing-services', async (req, res) => {
    try {
        const { serviceData } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Create publishing service request
        const { data: service, error } = await supabase
            .from('publishing_services')
            .insert({
                user_id: userId,
                service_type: serviceData.type,
                title: serviceData.title,
                description: serviceData.description,
                status: 'pending',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: {
                serviceId: service.id,
                status: 'pending',
                estimatedCompletion: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            }
        });
    } catch (error) {
        console.error('Error in publishing-services:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            function: 'publishing-services'
        });
    }
});

module.exports = router; 