document.addEventListener("load", componentWillMount);
document.addEventListener("submit", submitHandler);

// Global variables (similar to properties in a React component's state object).
let allTokens = null;
let ownedTokens = null;
let account = null;
let lyrifyInstance = null;
let submission = {
    ownerName: '',
    songTitle: '',
    lyrics: '',
};

/*
 * Sets web3 provider and invokes contract instantiation.
 */
function componentWillMount() {
    if (typeof web3 !== 'undefined') {
        window.web3 = new Web3(web3.currentProvider);
    } else {
        console.log('MetaMask failed to inject web3');
        window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
    }
    instantiateContract();
}

/*
 * Function to display the resulted succesful transaction after registering your lyrics.
 */
function displayLyrifySuccess() {
    let transactionHash = JSON.parse(window.localStorage.key(0));
    let currentSong = JSON.parse(window.localStorage.getItem(window.localStorage.key(0)));
    
    console.log("id: ", currentSong.id);
    console.log("transactionHash: ", transactionHash);
    console.log("currentSong: ", currentSong);
    console.log("localStorage: ", window.localStorage);

    document.getElementById("id").innerHTML = 'ID: ' + currentSong.id;
    document.getElementById("songtitle").innerHTML = 'Title: ' + currentSong.songName;
    document.getElementById("songlyrics").innerHTML = 'Lyrics: ' + currentSong.lyrics;
    document.getElementById("author").innerHTML = 'Author: ' + currentSong.ownerName;
    document.getElementById("hash").innerHTML = 'Hash: ' + transactionHash;
}

/*
 * Instantiates contract and updates global variables.
 */
function instantiateContract() {
    // Instantiate contract and set its web3 provider. This lets us access its functions.
    $.getJSON("LyrifyTokenOwnership.json", function (data) {
        const LyrifyTokenOwnership = data;
        const lyrifyContract = TruffleContract(LyrifyTokenOwnership);
        lyrifyContract.setProvider(web3.currentProvider);
   
        // Get accounts
        web3.eth.getAccounts((error, accounts) => {
            account = accounts[0];
            console.log("account: ", account);
        });
    
        // Set default account
        web3.eth.defaultAccount = web3.eth.accounts[0];
    
        // Create instance of contract at its deployed address (https://github.com/trufflesuite/truffle-contract).
        lyrifyContract.deployed().then(function (instance) {
            lyrifyInstance = instance;
            getTokens().then(result => {
                console.log("allTokens: ", result);
                allTokens = result;
            }); 
        });

        ///////////////////////////////////////////////////////////////////
        //=> TODO: Implement ownerLyrifyTokenCount
        ///////////////////////////////////////////////////////////////////

        // JSON stringify the default account's owned tokens.
        // lyrifyContract.deployed().then(function(instance) {
        //     lyrifyInstance = instance;
        //     return lyrifyInstance.ownerLyrifyTokenCount(web3.eth.defaultAccount)
        // }).then((result) => {
        //     ownedTokens = JSON.stringify(result);
        // });
    });
}

/*
 * Get tokens by account owner.
 */
function getLyrifyTokensByOwner(account) {
    return lyrifyInstance.getLyrifyTokensByOwner(account);
}

/*
 * Event handler for submit button that registers token with submission info.
 */
function submitHandler(event) {
    submission.ownerName = document.getElementById("firstname").value + ' ' + document.getElementById("lastname").value;
    submission.songTitle = document.getElementById("title").value;
    submission.lyrics = document.getElementById("lyrics").value;
    event.preventDefault();
    return registerToken();
};

/*
 * Registers token and redirects user to success page.
 */
function registerToken() {
    lyrifyInstance.registerToken(submission.ownerName, submission.songTitle, submission.lyrics, {
        from: account,
        value: web3.toWei(0.004, "ether"), // hardcoded value
        gas: 999999 // need to optimize this
    }).then((result) => {
        console.log("registered token: ", result);
        let submissionConfirmation = JSON.stringify(result.logs[0].args);
        let id = Number(JSON.parse(submissionConfirmation).id);
        let transactionHash = JSON.stringify(result.tx)
        
        // Clears localStorage so success page doesn't accidentally display previously registered tokens.
        window.localStorage.clear();
        window.localStorage.setItem(transactionHash, submissionConfirmation);
        window.location.href = '/success.html';

        alert("registered token: " + submissionConfirmation + transactionHash);
        getTokens().then(result => {
            console.log("allTokens: ", result);
            allTokens = result;
        });
    }).catch(err => {
        console.warn("error in registerToken: ", err);
        throw err;
    });
}

/*
 * Helper function that returns a promise whose resulting value contains token details in an array.
 * @param {Number} id - The index of an array of all Lyrify tokens owned by an account.
 */
function getLyrifyTokenDetails(id) {
    return lyrifyInstance.lyrifyTokens(id);
};

/*
 * Returns a promise whose resulting value is an array of all tokens ever.
 */
function getTokens() {
    // The following are not filtered by account owner WHATSOEVER...
    // But we can fake this right...
    let tokens = [];
    return getLyrifyTokensByOwner(account)
        .then(tokensIndexList => { // TODO: fix this...something in the contract is wrong
            console.log("Owned tokens list", tokensIndexList);
            const promises = [];
            for (let i = 0; i < tokensIndexList.length; i++) {
                promises.push(getLyrifyTokenDetails(i).then(token => {
                    const translatedToken = {
                        name: token[0],
                        songName: token[1],
                        lyrics: token[2]
                    }
                    return Promise.resolve(translatedToken);
                }));
            }
            return Promise.all(promises);
        });
}


function searchByID() {
    let id = document.getElementById("enterid").value;
    if (!id) {
        document.getElementById("notification").style.display = "block";
        document.getElementById("notification").innerHTML = 'Please enter a valid ID.';
    } else {
        document.getElementById("notification").style.display = "none";
    }
    console.log(id);
    id = Number(id);
    let tokenDetails = getLyrifyTokenDetails(id).then(token => {
        const translatedToken = {
            name: token[0],
            songName: token[1],
            lyrics: token[2]
        }
        console.log(translatedToken);
    });
}