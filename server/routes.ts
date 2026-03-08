import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { Router } from "express";
import { ZodError } from "zod";
import {
        catAppUsers,
        catNameOptions,
        catNameRatings,
        catTournamentSelections,
        userRoles,
} from "../shared/schema";
import { requireAdmin } from "./auth";
import { db } from "./db";
import {
        batchHideSchema,
        createNameSchema,
        createUserSchema,
        saveRatingsSchema,
        updateHideSchema,
        updateLockSchema,
} from "./validation";

export const router = Router();

// Mock data for when database is unavailable
const mockNames = [
        {
                id: "1",
                name: "Whiskers",
                description: "Classic tabby cat",
                avgRating: 1650,
                isActive: true,
                isHidden: false,
                status: "approved",
                pronunciation: "WHIS-kerz",
        },
        {
                id: "2",
                name: "Shadow",
                description: "Mysterious black cat",
                avgRating: 1600,
                isActive: true,
                isHidden: false,
                status: "approved",
                pronunciation: "SHAD-oh",
        },
        {
                id: "3",
                name: "Luna",
                description: "Elegant white cat",
                avgRating: 1580,
                isActive: true,
                isHidden: false,
                status: "approved",
                pronunciation: "LOO-nah",
        },
        {
                id: "4",
                name: "Muffin",
                description: "Sweet orange cat",
                avgRating: 1550,
                isActive: true,
                isHidden: false,
                status: "approved",
                pronunciation: "MUF-in",
        },
        {
                id: "5",
                name: "Mittens",
                description: "Playful kitten",
                avgRating: 1500,
                isActive: true,
                isHidden: false,
                status: "candidate",
                pronunciation: "MIT-enz",
        },
];

// Basic endpoint to get all active names
router.get("/api/names", async (req, res) => {
        try {
                if (!db) {
                        // Return mock data when database is unavailable
                        return res.json(mockNames);
                }

                const includeHidden = req.query.includeHidden === "true";
                const conditions = [eq(catNameOptions.isActive, true), eq(catNameOptions.isDeleted, false)];
                if (!includeHidden) {
                        conditions.push(eq(catNameOptions.isHidden, false));
                }
                const names = await db
                        .select()
                        .from(catNameOptions)
                        .where(and(...conditions))
                        .orderBy(desc(catNameOptions.avgRating))
                        .limit(1000);
                res.json(names);
        } catch (error) {
                console.error("Error fetching names:", error);
                res.status(500).json({ error: "Failed to fetch names" });
        }
});

// Create a new name
router.post("/api/names", async (req, res) => {
        try {
                const { name, description } = createNameSchema.parse(req.body);

                if (!db) {
                        // Return mock response when database is unavailable
                        return res.json({
                                success: true,
                                data: {
                                        id: String(Date.now()),
                                        name: name.trim(),
                                        description: (description || "").trim(),
                                        status: "candidate",
                                        provenance: null,
                                        avgRating: 1500,
                                        isActive: true,
                                        isHidden: false,
                                },
                        });
                }

                const [inserted] = await db
                        .insert(catNameOptions)
                        .values({
                                name: name.trim(),
                                description: (description || "").trim(),
                                status: "candidate",
                                provenance: null,
                        })
                        .returning();
                res.json({ success: true, data: inserted });
        } catch (error) {
                if (error instanceof ZodError) {
                        return res.status(400).json({ success: false, error: error.errors });
                }
                console.error("Error creating name:", error);
                res.status(500).json({ success: false, error: "Failed to create name" });
        }
});

// Delete a name by ID (Soft Delete)
router.delete("/api/names/:id", requireAdmin, async (req, res) => {
        try {
                if (!db) {
                        return res.json({ success: true });
                }
                await db
                        .update(catNameOptions)
                        .set({ isDeleted: true, deletedAt: new Date() })
                        .where(eq(catNameOptions.id, Number(req.params.id)));
                res.json({ success: true });
        } catch (error) {
                console.error("Error deleting name:", error);
                res.status(500).json({ success: false, error: "Failed to delete name" });
        }
});

// Delete a name by name string (Soft Delete)
router.delete("/api/names-by-name/:name", requireAdmin, async (req, res) => {
        try {
                if (!db) {
                        return res.json({ success: true });
                }
                await db
                        .update(catNameOptions)
                        .set({ isDeleted: true, deletedAt: new Date() })
                        .where(eq(catNameOptions.name, req.params.name));
                res.json({ success: true });
        } catch (error) {
                console.error("Error deleting name:", error);
                res.status(500).json({ success: false, error: "Failed to delete name" });
        }
});

// Update hidden status
router.patch("/api/names/:id/hide", requireAdmin, async (req, res) => {
        try {
                const { isHidden } = updateHideSchema.parse(req.body);
                if (!db) {
                        return res.json({ success: true });
                }
                await db
                        .update(catNameOptions)
                        .set({ isHidden })
                        .where(eq(catNameOptions.id, Number(req.params.id)));
                res.json({ success: true });
        } catch (error) {
                if (error instanceof ZodError) {
                        return res.status(400).json({ success: false, error: error.errors });
                }
                console.error("Error updating name:", error);
                res.status(500).json({ success: false, error: "Failed to update name" });
        }
});

// Batch update hidden status
router.post("/api/names/batch-hide", requireAdmin, async (req, res) => {
        try {
                const { nameIds, isHidden } = batchHideSchema.parse(req.body);
                // biome-ignore lint/suspicious/noExplicitAny: simple object type
                const results: { nameId: any; success: boolean; error?: string }[] = [];

                if (!db) {
                        // Return mock results when database is unavailable
                        // biome-ignore lint/suspicious/noExplicitAny: mocking simple object
                        return res.json({ results: nameIds.map((id: any) => ({ nameId: id, success: true })) });
                }

                try {
                        if (nameIds.length > 0) {
                                await db
                                        .update(catNameOptions)
                                        .set({ isHidden })
                                        .where(inArray(catNameOptions.id, nameIds));
                        }

                        // All succeeded
                        for (const nameId of nameIds) {
                                results.push({ nameId, success: true });
                        }
                        res.json({ results });
                } catch (error) {
                        // All failed
                        for (const nameId of nameIds) {
                                results.push({ nameId, success: false, error: String(error) });
                        }
                        res.json({ results });
                }
        } catch (error) {
                console.error("Error batch updating names:", error);
                res.status(500).json({ error: "Failed to batch update names" });
        }
});

// Get hidden names
router.get("/api/hidden-names", requireAdmin, async (_req, res) => {
        try {
                if (!db) {
                        return res.json([]);
                }
                const hidden = await db
                        .select()
                        .from(catNameOptions)
                        .where(and(eq(catNameOptions.isHidden, true), eq(catNameOptions.isDeleted, false)));
                res.json(hidden);
        } catch (error) {
                console.error("Error fetching hidden names:", error);
                res.status(500).json({ error: "Failed to fetch hidden names" });
        }
});

// Update locked in status
router.patch("/api/names/:id/lock", requireAdmin, async (req, res) => {
        try {
                const { lockedIn } = updateLockSchema.parse(req.body);
                if (!db) {
                        return res.json({ success: true });
                }
                await db
                        .update(catNameOptions)
                        .set({ lockedIn })
                        .where(eq(catNameOptions.id, Number(req.params.id)));
                res.json({ success: true });
        } catch (error) {
                if (error instanceof ZodError) {
                        return res.status(400).json({ success: false, error: error.errors });
                }
                console.error("Error locking name:", error);
                res.status(500).json({ error: "Failed to lock name" });
        }
});

// User management endpoints
router.post("/api/users", async (req, res) => {
        try {
                const { userName, preferences } = createUserSchema.parse(req.body);

                if (!db) {
                        return res.json({
                                success: true,
                                data: {
                                        userId: "mock-uuid",
                                        userName,
                                        preferences: preferences || {},
                                },
                        });
                }

                // Upsert user based on userName (assuming unique) to get userId
                const [inserted] = await db
                        .insert(catAppUsers)
                        .values({
                                userName,
                                preferences: preferences || {},
                        })
                        .onConflictDoUpdate({
                                target: catAppUsers.userName,
                                set: { preferences: sql`COALESCE(excluded.preferences, cat_app_users.preferences)` },
                        })
                        .returning();
                res.json({ success: true, data: inserted });
        } catch (error) {
                if (error instanceof ZodError) {
                        return res.status(400).json({ success: false, error: error.errors });
                }
                console.error("Error creating user:", error);
                res.status(500).json({ error: "Failed to create user" });
        }
});

// Get user roles
router.get("/api/users/:userId/roles", async (req, res) => {
        try {
                if (!db) {
                        return res.json([]);
                }
                const roles = await db.select().from(userRoles).where(eq(userRoles.userId, req.params.userId));
                res.json(roles);
        } catch (error) {
                console.error("Error fetching user roles:", error);
                res.status(500).json({ error: "Failed to fetch user roles" });
        }
});

// Save ratings
router.post("/api/ratings", async (req, res) => {
        try {
                const { userId, ratings } = saveRatingsSchema.parse(req.body);

                if (!db) {
                        return res.json({ success: true, count: ratings.length });
                }

                // biome-ignore lint/suspicious/noExplicitAny: simple object type
                const records = ratings.map((r: any) => ({
                        userId,
                        nameId: r.nameId,
                        rating: r.rating || 1500,
                        wins: r.wins || 0,
                        losses: r.losses || 0,
                }));

                // Optimization: Batch insert to prevent N+1 queries
                if (records.length > 0) {
                        await db
                                .insert(catNameRatings)
                                .values(records)
                                .onConflictDoUpdate({
                                        target: [catNameRatings.userId, catNameRatings.nameId],
                                        set: {
                                                rating: sql`excluded.rating`,
                                                wins: sql`cat_name_ratings.wins + excluded.wins`,
                                                losses: sql`cat_name_ratings.losses + excluded.losses`,
                                        },
                                });
                }

                res.json({ success: true, count: records.length });
        } catch (error) {
                if (error instanceof ZodError) {
                        return res.status(400).json({ success: false, error: error.errors });
                }
                console.error("Error saving ratings:", error);
                res.status(500).json({ error: "Failed to save ratings" });
        }
});

// Get analytics - popularity
router.get("/api/analytics/popularity", async (req, res) => {
        try {
                // Limit to max 100 to prevent DoS
                const rawLimit = parseInt(req.query.limit as string, 10) || 20;
                const limit = Math.min(Math.max(rawLimit, 1), 100);

                if (!db) {
                        return res.json(
                                mockNames.slice(0, limit).map((n) => ({
                                        nameId: n.id,
                                        name: n.name,
                                        count: Math.floor(Math.random() * 100),
                                })),
                        );
                }

                const results = await db
                        .select({
                                nameId: catTournamentSelections.nameId,
                                name: catNameOptions.name,
                                count: sql<number>`count(*)`,
                        })
                        .from(catTournamentSelections)
                        .innerJoin(catNameOptions, eq(catTournamentSelections.nameId, catNameOptions.id))
                        .groupBy(catTournamentSelections.nameId, catNameOptions.name)
                        .orderBy((_t) => desc(sql<number>`count(*)`))
                        .limit(limit);
                res.json(results);
        } catch (error) {
                console.error("Error fetching popularity:", error);
                res.status(500).json({ error: "Failed to fetch popularity" });
        }
});

// Get analytics - ranking history
router.get("/api/analytics/ranking-history", async (_req, res) => {
        try {
                if (!db) {
                        return res.json(
                                mockNames.map((n) => ({
                                        nameId: n.id,
                                        name: n.name,
                                        avgRating: n.avgRating,
                                })),
                        );
                }

                const ratings = await db
                        .select({
                                nameId: catNameRatings.nameId,
                                name: catNameOptions.name,
                                avgRating: sql<number>`avg(cat_name_ratings.rating)`,
                        })
                        .from(catNameRatings)
                        .innerJoin(catNameOptions, eq(catNameRatings.nameId, catNameOptions.id))
                        .groupBy(catNameRatings.nameId, catNameOptions.name)
                        .limit(100);

                res.json(ratings);
        } catch (error) {
                console.error("Error fetching ranking history:", error);
                res.status(500).json({ error: "Failed to fetch ranking history" });
        }
});

// Get analytics - leaderboard
router.get("/api/analytics/leaderboard", async (req, res) => {
        try {
                // Limit to max 100 to prevent DoS
                const rawLimit = parseInt(req.query.limit as string, 10) || 50;
                const limit = Math.min(Math.max(rawLimit, 1), 100);

                if (!db) {
                        return res.json(
                                mockNames.slice(0, limit).map((n) => ({
                                        nameId: n.id,
                                        name: n.name,
                                        avgRating: n.avgRating,
                                        totalWins: Math.floor(Math.random() * 50),
                                        totalLosses: Math.floor(Math.random() * 50),
                                })),
                        );
                }

                const ratings = await db
                        .select({
                                nameId: catNameRatings.nameId,
                                name: catNameOptions.name,
                                avgRating: sql<number>`round(avg(cat_name_ratings.rating))`,
                                totalWins: sql<number>`sum(cat_name_ratings.wins)`,
                                totalLosses: sql<number>`sum(cat_name_ratings.losses)`,
                                totalVotes: sql<number>`count(cat_name_ratings.rating)`,
                        })
                        .from(catNameRatings)
                        .innerJoin(catNameOptions, eq(catNameRatings.nameId, catNameOptions.id))
                        .where(eq(catNameOptions.isDeleted, false))
                        .groupBy(catNameRatings.nameId, catNameOptions.name)
                        .orderBy((_r) => desc(sql<number>`avg(cat_name_ratings.rating)`))
                        .limit(limit);

                res.json(ratings);
        } catch (error) {
                console.error("Error fetching leaderboard:", error);
                res.status(500).json({ error: "Failed to fetch leaderboard" });
        }
});

// Site stats
router.get("/api/analytics/site-stats", async (_req, res) => {
        try {
                if (!db) {
                        return res.json({
                                totalNames: mockNames.length,
                                totalRatings: Math.floor(Math.random() * 500),
                                totalUsers: Math.floor(Math.random() * 50),
                        });
                }

                const [totalNames, totalRatings, totalUsers] = await Promise.all([
                        db
                                .select({ count: sql<number>`count(*)` })
                                .from(catNameOptions)
                                .where(eq(catNameOptions.isDeleted, false)),
                        db.select({ count: sql<number>`count(*)` }).from(catNameRatings),
                        db.select({ count: sql<number>`count(distinct user_id)` }).from(catNameRatings),
                ]);

                res.json({
                        totalNames: totalNames[0]?.count || 0,
                        totalRatings: totalRatings[0]?.count || 0,
                        totalUsers: totalUsers[0]?.count || 0,
                });
        } catch (error) {
                console.error("Error fetching site stats:", error);
                res.status(500).json({ error: "Failed to fetch site stats" });
        }
});

// Get analytics - top-selected names (alias for popularity endpoint)
router.get("/api/analytics/top-selected", async (req, res) => {
        try {
                const rawLimit = parseInt(req.query.limit as string, 10) || 50;
                const limit = Math.min(Math.max(rawLimit, 1), 100);

                if (!db) {
                        return res.json(
                                mockNames.slice(0, limit).map((n) => ({
                                        nameId: n.id,
                                        name: n.name,
                                        times_selected: Math.floor(Math.random() * 100),
                                })),
                        );
                }

                const results = await db
                        .select({
                                nameId: catTournamentSelections.nameId,
                                name: catNameOptions.name,
                                times_selected: sql<number>`count(*)`,
                        })
                        .from(catTournamentSelections)
                        .innerJoin(catNameOptions, eq(catTournamentSelections.nameId, catNameOptions.id))
                        .groupBy(catTournamentSelections.nameId, catNameOptions.name)
                        .orderBy((_t) => desc(sql<number>`count(*)`))
                        .limit(limit);
                res.json(results);
        } catch (error) {
                console.error("Error fetching top-selected names:", error);
                res.status(500).json({ error: "Failed to fetch top-selected names" });
        }
});

// Get analytics - popularity scores (combined popularity + rating data)
router.get("/api/analytics/popularity-scores", async (req, res) => {
        try {
                const rawLimit = parseInt(req.query.limit as string, 10) || 50;
                const limit = Math.min(Math.max(rawLimit, 1), 100);

                if (!db) {
                        return res.json(
                                mockNames.slice(0, limit).map((n) => ({
                                        nameId: n.id,
                                        name: n.name,
                                        avg_rating: n.avgRating,
                                        total_wins: Math.floor(Math.random() * 50),
                                        times_selected: Math.floor(Math.random() * 100),
                                })),
                        );
                }

                const results = await db
                        .select({
                                nameId: catNameRatings.nameId,
                                name: catNameOptions.name,
                                avg_rating: sql<number>`avg(cat_name_ratings.rating)`,
                                total_wins: sql<number>`sum(cat_name_ratings.wins)`,
                                times_selected: sql<number>`count(*)`,
                        })
                        .from(catNameRatings)
                        .innerJoin(catNameOptions, eq(catNameRatings.nameId, catNameOptions.id))
                        .groupBy(catNameRatings.nameId, catNameOptions.name)
                        .orderBy((_r) => desc(sql<number>`avg(cat_name_ratings.rating)`))
                        .limit(limit);
                res.json(results);
        } catch (error) {
                console.error("Error fetching popularity scores:", error);
                res.status(500).json({ error: "Failed to fetch popularity scores" });
        }
});

// Get raw ratings for a user (used by personal analytics)
router.get("/api/analytics/ratings-raw", async (req, res) => {
        try {
                const userName = req.query.userName as string | undefined;

                if (!db) {
                        return res.json([]);
                }

                if (!userName) {
                        return res.status(400).json({ error: "userName query parameter is required" });
                }

                // Look up userId from userName
                const [user] = await db
                        .select({ userId: catAppUsers.userId })
                        .from(catAppUsers)
                        .where(eq(catAppUsers.userName, userName))
                        .limit(1);

                if (!user) {
                        return res.json([]);
                }

                const ratings = await db
                        .select({
                                nameId: catNameRatings.nameId,
                                rating: catNameRatings.rating,
                                wins: catNameRatings.wins,
                                losses: catNameRatings.losses,
                        })
                        .from(catNameRatings)
                        .where(eq(catNameRatings.userId, user.userId));

                res.json(ratings);
        } catch (error) {
                console.error("Error fetching raw ratings:", error);
                res.status(500).json({ error: "Failed to fetch raw ratings" });
        }
});

// Get aggregated user stats
router.get("/api/analytics/user-stats", async (req, res) => {
        try {
                const userName = req.query.userName as string | undefined;

                if (!db) {
                        return res.json({ totalRatings: 0, totalWins: 0, totalLosses: 0 });
                }

                if (!userName) {
                        return res.status(400).json({ error: "userName query parameter is required" });
                }

                const [user] = await db
                        .select({ userId: catAppUsers.userId })
                        .from(catAppUsers)
                        .where(eq(catAppUsers.userName, userName))
                        .limit(1);

                if (!user) {
                        return res.json({ totalRatings: 0, totalWins: 0, totalLosses: 0 });
                }

                const [stats] = await db
                        .select({
                                totalRatings: sql<number>`count(*)`,
                                totalWins: sql<number>`sum(cat_name_ratings.wins)`,
                                totalLosses: sql<number>`sum(cat_name_ratings.losses)`,
                        })
                        .from(catNameRatings)
                        .where(eq(catNameRatings.userId, user.userId));

                res.json(stats ?? { totalRatings: 0, totalWins: 0, totalLosses: 0 });
        } catch (error) {
                console.error("Error fetching user stats:", error);
                res.status(500).json({ error: "Failed to fetch user stats" });
        }
});

// Default error handler
// biome-ignore lint/suspicious/noExplicitAny: error handler middleware has specific signature
router.use((err: any, _req: any, res: any, _next: any) => {
        console.error("Route error:", err);
        res.status(500).json({ error: "Internal server error" });
});
