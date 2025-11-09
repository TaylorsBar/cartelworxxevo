import { Client, TopicCreateTransaction, TopicMessageSubmitTransaction } from '@hashgraph/sdk';
import { MaintenanceRecord, TuningRecord } from '../types';

const HEDERA_CONFIG = {
  network: 'testnet',
  accountId: process.env.HEDERA_ACCOUNT_ID,
  privateKey: process.env.HEDERA_PRIVATE_KEY,
  mirrorNode: 'testnet.mirrornode.hedera.com:443'
};

export class HederaService {
  private client: Client;
  private topicId: string;

  async initialize() {
    if (!HEDERA_CONFIG.accountId || !HEDERA_CONFIG.privateKey) {
        console.warn("Hedera account ID or private key not set. Skipping Hedera initialization.");
        return;
    }
    this.client = Client.forTestnet();
    this.client.setOperator(HEDERA_CONFIG.accountId, HEDERA_CONFIG.privateKey);

    try {
        const topicTx = await new TopicCreateTransaction()
          .setTopicMemo('CartelWorxxEVO Vehicle Audit Trail')
          .execute(this.client);
        
        const receipt = await topicTx.getReceipt(this.client);
        this.topicId = receipt.topicId.toString();
        console.log(`Hedera topic created: ${this.topicId}`);
    } catch (error) {
        console.error("Error initializing Hedera service:", error);
    }
  }

  async logServiceRecord(record: MaintenanceRecord): Promise<string> {
    if (!this.client || !this.topicId) {
        console.warn('Hedera client not initialized. Skipping service record log.');
        return 'ERROR_NOT_INITIALIZED';
    }
    const message = JSON.stringify({
      type: 'maintenance',
      ...record
    });
    
    const submitTx = await new TopicMessageSubmitTransaction()
      .setTopicId(this.topicId)
      .setMessage(message)
      .execute(this.client);
    
    const receipt = await submitTx.getReceipt(this.client);
    return receipt.status.toString();
  }

  async logECUModification(tuningData: TuningRecord): Promise<string> {
    if (!this.client || !this.topicId) {
        console.warn('Hedera client not initialized. Skipping tuning record log.');
        return 'ERROR_NOT_INITIALIZED';
    }
    const message = JSON.stringify({
        type: 'tuning',
        ...tuningData
    });
    
    const submitTx = await new TopicMessageSubmitTransaction()
      .setTopicId(this.topicId)
      .setMessage(message)
      .execute(this.client);
    
    const receipt = await submitTx.getReceipt(this.client);
    return receipt.status.toString();
  }
}
