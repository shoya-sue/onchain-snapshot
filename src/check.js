const { createUmi } = require('@metaplex-foundation/umi');
const { mplTokenMetadata, findMetadataPda } = require('@metaplex-foundation/mpl-token-metadata');
const { mplBubblegum } = require('@metaplex-foundation/mpl-bubblegum');
const { publicKey } = require('@metaplex-foundation/umi');
const { getCompressedNftsByCollection } = require('@metaplex-foundation/mpl-bubblegum/dist/src/operations');
const { connection } = require('@metaplex-foundation/umi-web3js-adapters');
const fs = require('fs');
const path = require('path');

// RPC設定 (適切なエンドポイントに変更してください)
const RPC_URL = 'https://api.mainnet-beta.solana.com';

// Umiインスタンス作成（プログラムリポジトリ設定を追加）
const umi = createUmi(RPC_URL)
  .use(connection())
  .use(mplTokenMetadata())
  .use(mplBubblegum());

// CSV出力関数
const outputToCSV = (data, filename) => {
  const csvHeader = 'MintAddress,Owner,CollectionAddress\n';
  const csvContent = data.map(nft => 
    `${nft.mintAddress},${nft.owner},${nft.collectionAddress}`
  ).join('\n');
  
  fs.writeFileSync(filename, csvHeader + csvContent, 'utf-8');
};

// NFTオーナー情報取得関数
const getNFTOwnersInCollection = async (collectionAddress) => {
  try {
    // コレクションアドレスをPublicKeyに変換
    const collectionPubkey = publicKey(collectionAddress);

    // Compressed NFTを取得
    const compressedNfts = await getCompressedNftsByCollection(umi, collectionPubkey);

    // オーナー情報を含むNFTデータを取得
    const nftOwnerData = compressedNfts.map((nft) => ({
      mintAddress: nft.mint.toString(),
      owner: nft.owner.toString(),
      collectionAddress: collectionAddress
    }));

    return nftOwnerData;
  } catch (error) {
    console.error('NFT取得中にエラーが発生:', error);
    throw error;
  }
};

// メイン関数
const main = async () => {
  // コマンドライン引数からコレクションアドレスを取得
  const collectionAddress = process.argv[2];

  if (!collectionAddress) {
    console.error('コレクションアドレスを指定してください。');
    console.log('使用方法: node src/check.js <CollectionAddress>');
    process.exit(1);
  }

  try {
    // NFTオーナー情報を取得
    const nftOwnerData = await getNFTOwnersInCollection(collectionAddress);

    // CSV出力ディレクトリ作成
    const csvDir = path.resolve(__dirname, '../csv');
    if (!fs.existsSync(csvDir)) {
      fs.mkdirSync(csvDir, { recursive: true });
    }

    // ファイル名生成（YYYYMMDD_HHMMSS形式）
    const timestamp = new Date().toISOString().replace(/[:-]/g, '').slice(0, 15);
    const csvFilename = path.join(csvDir, `${timestamp}.csv`);

    // CSV出力
    outputToCSV(nftOwnerData, csvFilename);

    console.log(`Compressed NFTオーナー情報をCSV出力しました: ${csvFilename}`);
    console.log(`総NFT数: ${nftOwnerData.length}`);
  } catch (error) {
    console.error('エラーが発生しました:', error.message);
    process.exit(1);
  }
};

// スクリプト実行
main();