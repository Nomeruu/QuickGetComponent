import * as vscode from 'vscode';

// 有効時
export function activate(context: vscode.ExtensionContext) {
	// メッセージボックスにメッセージを表示する処理を無名関数で渡している
	let disposable = vscode.commands.registerCommand('unityquickgetcomponent.unityQuickGetComponent', () => {		
		// ---１：カーソル行を取得----------------------
		const editor = vscode.window.activeTextEditor;
		const cursorPosition = editor?.selection.active;
		const editingDocument = editor?.document;
		if (cursorPosition == null) {
			vscode.window.showInformationMessage(
				"UQGエラー：カーソルの位置を読み取れませんでした");
			return;
		}
		const cursorLineText = editingDocument?.lineAt(cursorPosition).text;


		// ---２：カーソル行から型名と変数名を取り出す
		if (cursorLineText == null) {
			vscode.window.showInformationMessage(
				"UQGエラー：カーソルがある行を読み取れませんでした");
			return;
		}
		// テンプレートに合致しているかを調べ、合致してないならエラー
		const regExpTemplate = new RegExp(" *.+ +.+ *;");
		const componentTemplateArray = cursorLineText.match(regExpTemplate);
		if (componentTemplateArray == null) {
			vscode.window.showInformationMessage(
				"UQGエラー：[型名] [変数名]; になっている行を選択していません");
			return;
		}


		// クラス名、型名を取得
		// 正規表現：[空白以外、セミコロン以外]が１個以上、複数を出力
		const regExpName = new RegExp("[^ ^;]+", "g");

		const nameArray = cursorLineText.match(regExpName);
		if (nameArray == null) {
			vscode.window.showInformationMessage(
				"UQGエラー：クラス名が見つかりません");
			return;
		}
		if (nameArray.length < 2) {
			vscode.window.showInformationMessage(
				"UQGエラー：変数名が見つかりません");
			return;
		}
		let className = nameArray[0];
		let variableName = nameArray[1];


		// ---３ TODO：ドキュメント内のclassの位置を見つける
		const documentText = editingDocument?.getText();
		if (documentText == null) {
			vscode.window.showInformationMessage("UQGエラー：編集中のドキュメントが見つかりません");
			return;
		}
		// 正規表現：public class クラス名 : MonoBehaviour
		const regExpDocumentClass = new RegExp("public class .+ *: *MonoBehaviour");
		const scriptClassCharacter = documentText.match(regExpDocumentClass);
		if (scriptClassCharacter == null) {
			vscode.window.showInformationMessage("UQGエラー：スクリプトのクラス名が見つかりません（正規表現）");
			return;
		}
		const scriptClassPosition = editingDocument?.positionAt(documentText.indexOf(scriptClassCharacter[0]));


		// ---４：RequireComponent文と挿入位置を用意する
		if (scriptClassPosition == null) {
			vscode.window.showInformationMessage("UQGエラー：スクリプトのクラス名が見つかりません（Position）");
			return;
		}
		const requireComponentCharacter = "[RequireComponent(typeof(" + className + "))]\n";
		let requireCharacterLength = requireComponentCharacter.length;
		// Editは最後に行う


		// ---５：文書内のstartの位置を見つける
		// 正規表現：(private)? void Start() (/n)? {
		// RegExpの引数は文字列であるため、
		// エスケープの際はバックスラッシュを２重に用意する必要がある
		const regExpStartFunction = new RegExp("void Start\\(\\) *(\\n|\\r\\n|\\r)? *{");
		const startFunctionCharacter = documentText.match(regExpStartFunction);
		if (startFunctionCharacter == null) {
			vscode.window.showInformationMessage("UnityQG：void Start(){}を追加してください。処理を中止します");
			return;
		}


		// ---６：GetComponent文と挿入位置を用意する
		// Start()があるインデックス。ただしRequireを入れてない場合の話。
		const startFunctionIndex = documentText.indexOf(startFunctionCharacter[0]);
		const getcomponentCharacter = "		" + variableName + " = GetComponent<" + className + ">();\n";
		
		// Positionを作る
		let getComponentInsertPosition = editingDocument?.positionAt(startFunctionIndex);
		if (getComponentInsertPosition == null) {
			vscode.window.showInformationMessage("エラー：void Start()の次の行が見つかりません（Position）");
			return;
		}
		// Requireを考慮して１行進める
		let newPositionLine = getComponentInsertPosition?.line + 1;
		// 改行があった場合、中括弧始まりの次の行にするため更に１行進める
		if(startFunctionCharacter[0].indexOf("\n") >= 0){
			newPositionLine = newPositionLine + 1;
		}
		const newPositionCharacter = 0;
		getComponentInsertPosition = new vscode.Position(newPositionLine, newPositionCharacter);

		// ---７：編集する
		editor?.edit(editBuilder => {
			// RequireComponentを追加
			editBuilder.insert(scriptClassPosition!, requireComponentCharacter);
			// GetComopnentを追加
			editBuilder.insert(getComponentInsertPosition!, getcomponentCharacter);
		});
	});

	context.subscriptions.push(disposable);
}

// 無効時
export function deactivate() { }