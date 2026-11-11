/**
 * Utility functions for OtakuCircle Friend Recommendation Grouping, Ranking, and Filtering
 */

export function formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export function groupAndRankRecommendations(recommendations, { filterStatus = 'active', searchQuery = '', friendFilter = 'all', sortBy = 'most_recommended' } = {}) {
    const groupsMap = new Map();

    (recommendations || []).forEach(rec => {
        const isManga = (rec.mediaType || rec.anime?.type || '').toLowerCase().includes('manga');
        const mediaType = isManga ? 'manga' : 'anime';
        const rawId = rec.anime?.mal_id || rec.animeId || rec._id;
        const idKey = `${mediaType}_${rawId}`;

        if (!groupsMap.has(idKey)) {
            groupsMap.set(idKey, {
                id: idKey,
                mediaType,
                animeId: rawId,
                anime: rec.anime || { mal_id: rec.animeId, title: rec.animeTitle, poster_url: rec.animePoster, type: isManga ? 'Manga' : 'TV' },
                records: [],
                distinctSendersMap: new Map()
            });
        }
        const group = groupsMap.get(idKey);
        group.records.push(rec);

        const senderId = rec.from?._id?.toString() || rec.from?.username || String(rec.from);
        if (senderId && !group.distinctSendersMap.has(senderId)) {
            group.distinctSendersMap.set(senderId, rec.from);
        }
    });

    let groups = Array.from(groupsMap.values()).map(group => {
        const distinctFriends = Array.from(group.distinctSendersMap.values());
        const distinctCount = distinctFriends.length;
        const timestamps = group.records.map(r => new Date(r.timestamp).getTime()).filter(t => !isNaN(t));
        const latestTimestamp = timestamps.length ? Math.max(...timestamps) : 0;
        
        const hasPlanned = group.records.some(r => r.status === 'planned');
        const hasCompleted = group.records.some(r => r.status === 'completed');
        const hasActive = group.records.some(r => !r.status || r.status === 'active');
        const allNotInterested = group.records.every(r => r.status === 'not_interested');
        const allArchived = group.records.every(r => r.status === 'archived');

        let groupStatus = 'active';
        if (hasActive) groupStatus = 'active';
        else if (hasPlanned) groupStatus = 'planned';
        else if (hasCompleted) groupStatus = 'completed';
        else if (allNotInterested) groupStatus = 'not_interested';
        else if (allArchived) groupStatus = 'archived';

        return {
            ...group,
            distinctFriends,
            distinctCount,
            latestTimestamp,
            groupStatus
        };
    });

    // Filter by Tab/Status
    if (filterStatus === 'active') {
        groups = groups.filter(g => g.groupStatus === 'active');
    } else if (filterStatus === 'multi_friend') {
        groups = groups.filter(g => g.groupStatus === 'active' && g.distinctCount >= 2);
    } else if (filterStatus === 'planned') {
        groups = groups.filter(g => g.records.some(r => r.status === 'planned'));
    } else if (filterStatus === 'completed') {
        groups = groups.filter(g => g.records.some(r => r.status === 'completed'));
    } else if (filterStatus === 'archived') {
        groups = groups.filter(g => g.records.some(r => r.status === 'archived'));
    } else if (filterStatus === 'not_interested') {
        groups = groups.filter(g => g.records.some(r => r.status === 'not_interested'));
    }

    // Filter by Friend
    if (friendFilter && friendFilter !== 'all') {
        groups = groups.filter(g => 
            g.records.some(r => (r.from?._id?.toString() === friendFilter || r.from?.username === friendFilter))
        );
    }

    // Search Filter
    if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        groups = groups.filter(g => {
            const titleMatch = (g.anime?.title || '').toLowerCase().includes(q);
            const genreMatch = (g.anime?.genres || []).some(genre => genre.toLowerCase().includes(q));
            const messageMatch = g.records.some(r => (r.message || '').toLowerCase().includes(q));
            const friendMatch = g.distinctFriends.some(f => (f?.username || '').toLowerCase().includes(q));
            return titleMatch || genreMatch || messageMatch || friendMatch;
        });
    }

    // Ranking & Sorting
    groups.sort((a, b) => {
        if (sortBy === 'most_recommended') {
            // Priority 1: Distinct Friend Count
            if (b.distinctCount !== a.distinctCount) {
                return b.distinctCount - a.distinctCount;
            }
            // Priority 2: Recency Tie-Breaker
            return b.latestTimestamp - a.latestTimestamp;
        }

        if (sortBy === 'recently_received') {
            return b.latestTimestamp - a.latestTimestamp;
        }

        if (sortBy === 'highest_rated') {
            const scoreA = Number(a.anime?.score) || 0;
            const scoreB = Number(b.anime?.score) || 0;
            return scoreB - scoreA;
        }

        return 0;
    });

    return groups;
}
