import { useEffect, useState } from 'react';

import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import idl from './idl.json';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Provider, Program, web3, BN } from '@project-serum/anchor';

import kp from './keypair.json'

const { SystemProgram, Keypair } = web3

const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

const programID = new PublicKey(idl.metadata.address)
const network = clusterApiUrl('devnet')
const opts = {
  preflightCommitment: 'processed'
}

// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const TEST_GIFS = [
  'https://media.giphy.com/media/ROcSJHrOhhBkc/giphy.gif',
  'https://media.giphy.com/media/tOE2zmvxYZod2/giphy.gif',
  'https://media.giphy.com/media/3ohzdVwYXahU2HhHNe/giphy.gif',
  'https://media.giphy.com/media/3d8mQWANXGDdJAM6t0/giphy.gif',
  'https://media.giphy.com/media/idRrg9aowbpK9QYD0P/giphy.gif'
]

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null)
  const [inputValue, setIntputValue] = useState('')
  const [gifList, setGifList] = useState(null)

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    )
    return provider
  }

  const createGifAccount = async () => {
    try {
      const provider = getProvider()
      const program = new Program(idl, programID, provider)
      console.log('PING')
      await program.rpc.startMarmotCentral({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId
        },
        signers: [baseAccount]
      })
      console.log("Creates a new BaseAccount w/ address", baseAccount.publicKey.toString())
      await getGifList()
    } catch (e) {
      console.error('Error creating BaseAccount account:', e)
    }
  }

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;
      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!')

          const response = await solana.connect({ onlyIfTrusted: true })
          console.log(
            'Connected with public key: ',
            response.publicKey.toString()
          )
          setWalletAddress(response.publicKey.toString())
        }
      } else {
        alert('Solana not found! Get a phantom wallet YOOOO')
      }
    } catch (error) {
      console.error(error)
    }
  }

  const connectWallet = async () => {
    const { solana } = window;
    if (solana) {
      const response = await solana.connect()
      console.log('Connected with public key: ', response.publicKey.toString())
      setWalletAddress(response.publicKey.toString())
    }
  }

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  )

  const onInputChange = (event) => {
    const { value } = event.target
    setIntputValue(value)
  }

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log('Gif link:', inputValue)
      return
    } else {
      try {
        const provider = getProvider()
        const program = new Program(idl, programID, provider)

        await program.rpc.addGif(inputValue, {
          accounts: {
            baseAccount: baseAccount.publicKey,
            user: provider.wallet.publicKey,
          }
        })
        console.log('GIF successfully sent to program', inputValue)

        await getGifList()
      } catch (e) {
        console.error('Error sending GIF:', e)
      }
      setIntputValue('')
    }
  }

  const getGifList = async () => {
    try {
      const provider = getProvider()
      const program = new Program(idl, programID, provider)
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey)

      setGifList(account.gifList)
    } catch (e) {
      console.error('Error getting Gifs: ', e)
      setGifList(null)
    }
  }

  const getMarmotness = (votes) => {
    if (votes.length === 0) return '--'
    const marmotVotes = votes.filter(vote => vote.isMarmot)
    return `${marmotVotes.length / votes.length}`
  }

  const voteMarmotness = async (id, vote) => {
    try {
      const provider = getProvider()
      const program = new Program(idl, programID, provider)

      await program.rpc.voteMarmotness(new BN(id), vote, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        }
      })
      console.log('Successfully sent vote')

      await getGifList()
    } catch (e) {
      console.error('Error voting:', e)
    }
  }

  const canVote = (votes) => {
    const provider = getProvider()
    for (const vote of votes) {
      if (vote.userAddress.toString() === provider.wallet.publicKey.toString()) {
        return false
      }
    }
    return true
  }

  const renderConnectedContainer = () => {
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      )
    } else {
      return (<div className="connected-container">
        <input
          type="text"
          placeholder="Enter gif link!"
          value={inputValue}
          onChange={onInputChange}
        />
        <button
          className="cta-button submit-gif-button"
          onClick={sendGif}
        >
          Submit
        </button>
        <div className="gif-grid">
          {
            gifList.map((gif, id) => (
              <div className="gif-item" key={gif.gifLink}>
                <img src={gif.gifLink} alt={gif} />
                {
                  canVote(gif.marmotness) && <p className="vote-text">
                    Is it a marmot?
                    <button className="vote-button" onClick={() => voteMarmotness(id, true)}>Yes</button>
                    <button className="vote-button" onClick={() => voteMarmotness(id, false)}>No</button>
                  </p>
                }
                <p className="sub-text">
                  Marmotness: {getMarmotness(gif.marmotness)}
                </p>
                <button className="cta-button tip-button">Tip</button>
              </div>
            ))
          }
        </div>
      </div>)
    }
  }


  useEffect(() => {
    window.addEventListener('load', async (e) => {
      await checkIfWalletIsConnected()
    })
  }, [])

  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching GIF list...')
      getGifList()
    }
  }, [walletAddress])

  return (
    <div className="App">
      <div className="container">
        <div className={walletAddress ? 'authed-container' : 'container'}>

          <div className="header-container">
            <p className="header">Only Marmots</p>
            <p className="sub-text">
              Your marmot collection in the metaverse ✨
            </p>
            {!walletAddress && renderNotConnectedContainer()}
            {!!walletAddress && renderConnectedContainer()}
          </div>
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
