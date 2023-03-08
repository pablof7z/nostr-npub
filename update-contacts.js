const axios = require('axios');
const { SimplePool, nip19 } = require('nostr-tools');
const fs = require('fs');
const path = require('path');
const homedir = require('os').homedir();

const nostrPath = path.join(homedir, '.nostr');

async function addContact(contacts, contact) {
    let {content, pubkey} = contact;
    try { content = JSON.parse(content) } catch (e) { return; }

    contacts[pubkey] = {
        name: content.name || content.display_name || content.displayName,
        nip05: content.nip05,
        npub: nip19.npubEncode(pubkey),
    }

    // check if we have a picture
    if (content.picture) {
        // console.log(`Downloading ${content.picture} to ${picturePath}`);
        try {
            const pic = await axios.get(content.picture, {responseType: 'arraybuffer'})
            if (pic.status === 200) {
                const contentType = pic.headers['content-type'];
                let ext;

                switch (contentType) {
                    case 'image/jpeg': ext = 'jpg'; break;
                    case 'image/png': ext = 'png'; break;
                    case 'image/gif': ext = 'gif'; break;
                    case 'image/webp': ext = 'webp'; break;
                }

                if (ext) {
                    contacts[pubkey].picture = `${pubkey}.${ext}`;
                    const picturePath = path.join(nostrPath, `${pubkey}.${ext}`);
                    
                    fs.writeFileSync(picturePath, pic.data);
                }
            } else {
                // console.log(`Error downloading ${content.picture}: ${pic.status} ${pic.statusMessage}`);
            }
        } catch (e) {
            // console.log(`Error downloading ${content.picture}`, e);
        }
    }

    return contacts;
}

async function updateContacts(pubkey, contacts) {
    // create pool
    const relays = ['wss://relay.nostr.band']

    const pool = new SimplePool()

    let events = await pool.list(relays, [{kinds: [3], authors:[pubkey]}])

    let pubkeys = new Set()

    events[0].tags.forEach((tag) => {
        if (tag[0] === 'p' && !pubkeys.has(tag[1])) {
            pubkeys.add(tag[1])
        }
    })

    // get all tags in 50 people chunks
    let i = 0
    while (i < pubkeys.size) {
        let chunk = Array.from(pubkeys).slice(i, i += 50)
        let list = await pool.list(relays, [{kinds: [0], authors: chunk}])
        list.forEach(async (c) => { contacts = await addContact(contacts, c) })
        console.log(`Seen ${Object.keys(contacts).length} contacts`);
    }

    return contacts;
}

module.exports = updateContacts