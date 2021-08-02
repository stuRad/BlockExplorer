const { Wallet, utils, providers: { JsonRpcProvider } } = require("ethers");

const methodsMessage = `


    Exported functions: getCurrentBlock, getAccountBalance(address), outputLatestBlockTransactions, outputBlockTotalETH(blockHash);
    How to run a function: npm run someFunc param
`
const PROVIDERS = {
  MAINNET: "mainnet",
  ROPSTEN: "ropsten",
  KOVAN: "kovan",
  RINKEBY: "rinkeby"
}
const providerChoice = PROVIDERS.MAINNET;
const providerString = `https://${providerChoice}.infura.io/v3/948f5de972d84e8b8d7d8978cbbf3a96`

const provider = new JsonRpcProvider(providerString);

//Useless function as it cannot set a persisting variable or provider instance from cmd
function setProvider(prov) {
  let providerChoice;
  switch(prov){
  case '0':
    providerChoice = PROVIDERS.MAINNET;
    break;
  case '1':
    providerChoice = PROVIDERS.ROPSTEN;
    break;
  case '2':
    providerChoice = PROVIDERS.KOVAN;
    break;
  case '3':
    providerChoice = PROVIDERS.RINKEBY;
    break;
  default:
    providerChoice = PROVIDERS.MAINNET;
  }
  var providerString = `https://${providerChoice}.infura.io/v3/948f5de972d84e8b8d7d8978cbbf3a96`
  var provider = new JsonRpcProvider(providerString);
}

//Gets the current block and extracts and prints out relevant information
async function getCurrentBlock() {

  let blockHeight = await provider.getBlockNumber();
  let blockFull = await provider.getBlockWithTransactions(blockHeight);

  const blockTimeStamp = blockFull.timestamp;
  const transactionCount = blockFull.transactions.length;
  const nonce = blockFull.nonce;
  const minedBy = blockFull.miner;
  const difficulty = blockFull.difficulty;
  const blockHash = blockFull.hash;

  const avgGasPrice = await getLatestBlockGasPrice();
  const currentGasPrice = await provider.getGasPrice();

  const totalETHArray = await getBlockTotalETH(blockHeight);
  const totalETH = totalETHArray[0];
  const highestETH = totalETHArray[1];

  const transSortArray = await getSortedTransactions();
  const totalTransValueZero = transSortArray[0];
  const totalTransValue = transSortArray[1];

  console.log(`

    Block Height: ${blockHeight}
    Block Hash: ${blockHash}
    TimeStamp: ${blockTimeStamp}
    Nonce: ${nonce}

    Mined By: ${minedBy.toLowerCase()}
    Difficulty: ${difficulty}

    Transactions: ${transactionCount}
        With No Value: ${totalTransValueZero}
        With Some Value: ${totalTransValue}
            Highest Value Transfer: ${highestETH} ETH
    Total ETH Transferred in Block: ${totalETH} ETH

    Average Gas Price: ${avgGasPrice} GWEI
    Current Gas Price: ${Math.round(utils.formatUnits(currentGasPrice, "gwei"))} GWEI
    `);

    console.log(methodsMessage);
}


//Takes an address and outputs its balance
async function getAccountBalance(address = "0x9c7bc79d5c47261388015f931ef8cbeb42ba8477") {

    let balance = await provider.getBalance(address);
    balance = utils.formatEther(balance);
    console.log(`

      ${balance} ETH
    `
  );
    console.log(methodsMessage);
}


//Takes a block's hash (or no arg will get latest)
//and prints the sum of each transaction's "value" element, and which was highest
async function outputBlockTotalETH(blockHash = "latest") {
  const outputArray = await getBlockTotalETH(blockHash);
  console.log(`

    Block: ${blockHash}
    Total ETH Transferred: ${outputArray[0]} ETH
    Highest Value Transfer: ${outputArray[1]} ETH

    `);

    console.log(methodsMessage);
}

//Helper function to get a block and extract just the transactions, then just the "value" elements
//returns a tuple array of the total ETH transferred and the highest value transfer "value"
async function getBlockTotalETH(blockNumber = "latest") {
  let blockHeight;
  if (blockNumber === "latest") {
    blockHeight = await provider.getBlockNumber();

  }
  else {
    blockHeight = blockNumber;
  }
  let blockFull = await provider.getBlockWithTransactions(blockHeight);
  let justTrans = blockFull.transactions;
  let transSum = 0;
  let maxVal = 0;
  for (let i = 0; i < justTrans.length; i++){
    let current = parseInt(justTrans[i].value, 16);
    if (current > maxVal) {
      maxVal = current;
    }
    transSum += current;
  }
  transSum = transSum.toString();
  maxVal = maxVal.toString();

  transSum = utils.formatEther(transSum);
  maxVal = utils.formatEther(maxVal);
  //console.log(transSum);
  return [transSum, maxVal];
}


//Prints out a condensed list of all transactions in the latest block
async function outputLatestBlockTransactions() {

  const transArray = await getLatestBlockTransactions();
  console.log(transArray);
  console.log(methodsMessage);
}


//Helper function
//Returns an array with each element as a condensed transaction object
async function getLatestBlockTransactions() {

  let blockNumber = await provider.getBlockNumber();
  let blockFull = await provider.getBlockWithTransactions(blockNumber);
  let justTrans = blockFull.transactions;
  let transArray = [];

  //Collect just transactions in an array (transArray)
  for (let i = 0; i < justTrans.length; i++){
    transArray.push({
      transactionIndex: justTrans[i].transactionIndex,
      hash: justTrans[i].hash,
      to: justTrans[i].to,

      from: {
        address: justTrans[i].from,
        r: justTrans[i].r,
        s: justTrans[i].s,
        v: justTrans[i].v
      },

      value: justTrans[i].value,

      gas: {
        amount: justTrans[i].gas,
        gasPrice: justTrans[i].gasPrice,
        gasLimit: justTrans[i].gasLimit
      },

      type: justTrans[i].type,
      nonce: justTrans[i].nonce
      //input, data
    });
  }
  return transArray;
}

//Gets an array of transactions from the latest block and sorts into two arrays based on whether the "value" element is 0 or not
//Returns just the length of each respective array for now
async function getSortedTransactions() {

  const transArray = await getLatestBlockTransactions();
  let transArrayOfValueZero = [];
  let transArrayOfValue = [];

  //Separate transactions into transfers (value is non zero) and others (value is zero)
  for (let t in transArray){
    if (transArray[t].value === '0x0'){
      transArrayOfValueZero.push(transArray[t]);
    }
    else {
      transArrayOfValue.push(transArray[t]);
    }
  }
  return [transArrayOfValueZero.length, transArrayOfValue.length];
}


//Helper function - gets all transactions for latest block, takes just the gasPrice for each, then gets the average
//Returns rounded formatted average gas price for latest block (GWEI)
async function getLatestBlockGasPrice() {

    const transArray = await getLatestBlockTransactions();
    let gasPrices = transArray.map(transaction => transaction.gas.gasPrice);
    gasPrices = gasPrices.map(price => parseInt(price, 16));
    let temp = Math.round(gasPrices.reduce((acc, cur) => acc + cur) / gasPrices.length);
    const avgGasPrice = utils.formatUnits(temp, "gwei");

    return Math.round(avgGasPrice);

}


module.exports = { getCurrentBlock, getAccountBalance, outputLatestBlockTransactions, outputBlockTotalETH }
