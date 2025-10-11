# Cloud Sync - Quick Reference Card

## 🚀 Quick Start (5 Minutes)

### 1. Get Supabase Credentials
- Go to [supabase.com](https://supabase.com) → Your Project
- Settings → API
- Copy: **Project URL** and **anon public key**

### 2. Configure Kiosk
- Navigate to: `http://localhost:3000/admin/sync`
- Click "Show Config"
- Paste URL and Key
- Click "Save Configuration"
- Click "Test Connection" ✓

### 3. Set Up Database
- Click "Download SQL Setup"
- Go to Supabase → SQL Editor
- Paste and Run the SQL script

### 4. Start Syncing
- Click "Sync Now" for manual sync
- Or enable "Auto-Sync" for automatic syncing every 5 minutes

---

## 📊 Understanding Sync Status

| Status | Meaning | Action Needed |
|--------|---------|---------------|
| 🟢 **All Synced** | All tickets backed up to cloud | None |
| 🟠 **X Pending** | X tickets waiting to sync | Click "Sync Now" |
| 🔴 **Offline** | No internet connection | Connect to internet |
| ⚪ **Not Configured** | Supabase not set up | Configure credentials |

---

## 🔄 Sync Methods

### Manual Sync
**When to use**: End of day, before maintenance, on-demand backup

**How to**:
1. Go to `/admin/sync`
2. Click "Sync Now"
3. Wait for completion
4. Check results

### Auto-Sync
**When to use**: Continuous operation, hands-free backup

**How to**:
1. Go to `/admin/sync`
2. Enable "Auto-Sync" checkbox
3. Syncs every 5 minutes automatically
4. Works only when online

---

## 🎯 Common Tasks

### Check Sync Status
- Look at bottom-right corner of screen
- Shows: Status, Pending count, Last sync time

### View Synced Data
- Go to Supabase Dashboard
- Table Editor → `tickets` table
- See all synced transactions

### Export Data
- `/admin/database` → "Export CSV" or "Export JSON"
- Backup local data to file

### Troubleshoot Sync Issues
1. Check internet connection
2. Test connection in `/admin/sync`
3. Check failed tickets list
4. Retry sync

---

## ⚠️ Important Notes

### ✅ DO
- Enable auto-sync for continuous backup
- Test connection after configuration
- Monitor sync statistics regularly
- Keep Supabase credentials secure
- Sync at least once per day

### ❌ DON'T
- Don't share API keys publicly
- Don't disable sync for extended periods
- Don't ignore failed sync reports
- Don't delete local data before syncing

---

## 🆘 Troubleshooting

### Problem: "Supabase not configured"
**Solution**: Configure URL and API Key in `/admin/sync`

### Problem: "No internet connection"
**Solution**: Connect to internet, sync will work automatically

### Problem: "Connection test failed"
**Solution**: 
- Verify URL and API Key are correct
- Check Supabase project is active
- Ensure SQL schema is set up

### Problem: "Some tickets failed to sync"
**Solution**:
- Check failed tickets list in sync results
- Verify data integrity
- Retry sync (duplicates are handled automatically)

---

## 📱 Access Points

| Feature | URL | Purpose |
|---------|-----|---------|
| Sync Manager | `/admin/sync` | Configure and manage sync |
| Database Viewer | `/admin/database` | View local tickets |
| Supabase Dashboard | `supabase.com` | View cloud data |

---

## 📈 Sync Statistics Explained

- **Total Tickets**: All tickets in local database
- **Synced to Cloud**: Successfully backed up
- **Pending Sync**: Waiting to be synced
- **Last Sync**: Time of last successful sync

**Healthy Status**: Synced = Total (no pending)

---

## 🔐 Security Tips

1. **API Keys**: Keep them confidential
2. **Access**: Limit admin page access
3. **Backups**: Regular exports as additional backup
4. **Monitoring**: Check sync logs regularly

---

## 📞 Support

**For Technical Issues**:
- Check browser console for errors
- Review `CLOUD_SYNC_SETUP.md` for detailed guide
- Verify Supabase project status

**For Data Issues**:
- Export local data as backup
- Check Supabase Table Editor
- Review failed tickets list

---

## ⏱️ Recommended Schedule

| Time | Task |
|------|------|
| **Daily** | Check sync status |
| **Daily** | Verify auto-sync is enabled |
| **Weekly** | Export local data backup |
| **Monthly** | Review Supabase storage usage |
| **As Needed** | Manual sync before maintenance |

---

## 🎓 Pro Tips

1. **Enable auto-sync** and forget about it
2. **Check status indicator** at bottom-right regularly
3. **Test connection** after any Supabase changes
4. **Export data** before major updates
5. **Monitor pending count** - should be 0 or low
6. **Sync before closing** kiosk for the day

---

## 📋 Pre-Flight Checklist

Before going live:
- [ ] Supabase project created
- [ ] SQL schema set up
- [ ] Credentials configured
- [ ] Connection tested successfully
- [ ] Auto-sync enabled
- [ ] Status indicator visible
- [ ] Test sync completed
- [ ] Backup export tested

---

**Version**: 1.0  
**Last Updated**: October 2025  
**For**: CTU-Kiosk System Administrators
