import { Component } from '@nestjs/common';
import { spawn } from 'child_process';
import { address } from 'ip';

@Component()
export class Screen {
  public clear() {
    console.log('\u001B[2J');
  }

  public printIp() {
    this.clear();
    let newLineCount = 0;
    const figlet = spawn('figlet', [
      '-w',
      // process.stdout.columns!.toString(),
      '100',
      '-c',
      'Cast IP Address\n' + address().replace(/\./g, ' . '),
    ]);

    figlet.stdout.on('data', data => {
      console.log(`${data}`);
      newLineCount += (String(data).match(/\n/g) || []).length;
    });

    figlet.on('close', () => {
      const lines = ((process.stdout.rows as number) - newLineCount) / 4;
      for (let i = 0; i < lines; ++i) console.log('\n');
    });
  }
}
