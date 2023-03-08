#!/usr/bin/env node

require('websocket-polyfill')
const { SimplePool, nip19 } = require('nostr-tools');
const updateContacts = require('./update-contacts.js');
const fs = require('fs');
const homedir = require('os').homedir();
const path = require('path');

const nostrPath = path.join(homedir, '.nostr');
const contactsPath = path.join(nostrPath, 'contacts.json');
const contactsDir = path.dirname(contactsPath);

const NPUB = 'npub1l2vyh47mk2p0qlsku7hg0vn29faehy9hy34ygaclpn66ukqp3afqutajft'; // ENTER YOUR NPUB HERE
const HEX_PUBKEY = nip19.decode(NPUB).data;

// read contacts from $HOME/.nostr/contacts.json and parse it
let contacts = {};
try {
    contacts = require(contactsPath);
} catch (e) {
    (async () => { await updateContacts(HEX_PUBKEY, contacts) })();
}

const searchString = process.argv[2];

if (Object.keys(contacts).length === 0 && searchString !== '--update') {
    console.log(`No contacts found. Run ${process.argv[1]} --update to fetch contacts.`);
    process.exit(0);
}

function search(q, contacts) {
    const regexp = new RegExp(`.*${q}.*`, 'i');

    let results = [];
    for (let pubkey in contacts) {
        if (contacts[pubkey].name?.toLowerCase().match(regexp)) {
            results.push(contacts[pubkey]);
        }
    }
    return results;
}

(async () => {
    if (searchString == '--update') {
        contacts = await updateContacts(HEX_PUBKEY, contacts)
    
        if (!fs.existsSync(contactsDir)) {
            fs.mkdirSync(contactsDir);
        }
    
        fs.writeFileSync(contactsPath, JSON.stringify(contacts, null, 2));

        process.exit(0)
    } else {
        const results = search(searchString, contacts);
        let items = [];

        items = results.map(r => {
            let d = {
                uid: r.npub,
                title: `${r.name} ${r.nip05 ? `<${r.nip05}>` : ''}`,
                subtitle: `Copy «${r.npub}»`,
                arg: r.npub,
                autocomplete: `${r.name} ${r.nip05 ? `<${r.nip05}>` : ''}`,
            }

            if (r.picture) {
                d.icon = {
                    path: path.join(nostrPath, r.picture)
                }
            }

            return d;
        });


        console.log(JSON.stringify({items}));
        
        process.exit(0);
    }
})()
